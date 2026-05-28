import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parse } from '../index.js';

function readFile(path: string): string {
  const filename = require.resolve(path);

  return readFileSync(filename, 'utf8');
}

const basic = readFile('./grammar/basic.pgn');
const benko = readFile('./grammar/benko.pgn');
const checkmate = readFile('./grammar/checkmate.pgn');
const comment = readFile('./grammar/comment.pgn');
const comments = readFile('./grammar/comments.pgn');
const games32 = readFile('./grammar/games32.pgn');
const lichess = readFile('./grammar/lichess.pgn');
const long = readFile('./grammar/long.pgn');
const multiple = readFile('./grammar/multiple-game.pgn');
const promotion = readFile('./grammar/promotion.pgn');
const single = readFile('./grammar/single.pgn');
const twic = readFile('./grammar/twic.pgn');
const variants = readFile('./grammar/variants.pgn');

const tests = {
  basic,
  benko,
  checkmate,
  comment,
  comments,
  games32,
  lichess,
  long,
  multiple,
  promotion,
  single,
  twic,
  variants,
};

describe('PGN Parser', () => {
  for (const [label, input] of Object.entries(tests)) {
    it(label, { timeout: 15_000 }, async () => {
      await expect(parse(input)).toMatchFileSnapshot(
        `./__snapshots__/${label}.snap`,
      );
    });
  }

  it('returns [] for malformed input', () => {
    expect(parse('not valid pgn !!!')).toEqual([]);
  });

  it('parses a comment containing nested braces', () => {
    const pgn = '1. e4 { see {Fischer} 1972 } e5 1-0';
    const result = parse(pgn);
    expect(result).toHaveLength(1);
    expect(result[0]?.moves[0]?.[1]?.comment).toBe('see {Fischer} 1972');
  });

  it('continues parsing moves after a nested-brace comment', () => {
    const pgn = '1. e4 { A {nested} comment } e5 2. Nf3 1-0';
    const result = parse(pgn);
    expect(result).toHaveLength(1);
    expect(result[0]?.moves[1]?.[1]).toMatchObject({
      piece: 'knight',
      to: 'f3',
    });
  });

  it('strips a UTF-8 BOM from the start of input', () => {
    const withBom = '\uFEFF[Event "Test"]\n[Result "1-0"]\n\n1. e4 1-0';
    const result = parse(withBom);
    expect(result).toHaveLength(1);
    expect(result[0]?.meta['Event']).toBe('Test');
  });

  it('handles escaped quotes in tag values', () => {
    const pgn =
      String.raw`[Event "\"Café\""]` + '\n[Result "1-0"]\n\n1. e4 1-0';
    const result = parse(pgn);
    expect(result).toHaveLength(1);
    expect(result[0]?.meta['Event']).toBe('"Café"');
  });

  it('handles escaped backslashes in tag values', () => {
    const pgn = String.raw`[Site "A\\B"]` + '\n[Result "1-0"]\n\n1. e4 1-0';
    const result = parse(pgn);
    expect(result).toHaveLength(1);
    expect(result[0]?.meta['Site']).toBe(String.raw`A\B`);
  });

  it('handles a backslash immediately followed by an escaped quote', () => {
    // PGN tag value "A\\\"B" should produce A\"B (backslash then quote)
    const pgn = String.raw`[Event "A\\\"B"]` + '\n[Result "1-0"]\n\n1. e4 1-0';
    const result = parse(pgn);
    expect(result).toHaveLength(1);
    expect(result[0]?.meta['Event']).toBe(String.raw`A\"B`);
  });

  it('ignores % escape lines between moves', () => {
    const pgn = '1. e4\n% this is an escape line\ne5 1-0';
    const result = parse(pgn);
    expect(result).toHaveLength(1);
    expect(result[0]?.moves[0]?.[2]).toMatchObject({ piece: 'pawn', to: 'e5' });
  });

  it('ignores % escape lines between games', () => {
    const pgn = '1. e4 e5 1-0\n% separator line\n1. d4 d5 0-1';
    const result = parse(pgn);
    expect(result).toHaveLength(2);
    expect(result[0]?.result).toBe(1);
    expect(result[1]?.result).toBe(0);
  });

  it('parses a game with no tags', () => {
    const pgn = '1. e4 e5 2. Nf3 Nc6 1-0';
    const result = parse(pgn);
    expect(result).toHaveLength(1);
    expect(result[0]?.meta).toEqual({});
    expect(result[0]?.result).toBe(1);
    expect(result[0]?.meta.Result).toBeUndefined();
  });

  it('parses a mixed file with tagged and tagless games', () => {
    const pgn = '[Event "Tagged"]\n[Result "1-0"]\n\n1. e4 1-0\n\n1. d4 0-1';
    const result = parse(pgn);
    expect(result).toHaveLength(2);
    expect(result[0]?.meta['Event']).toBe('Tagged');
    expect(result[1]?.meta).toEqual({});
    expect(result[1]?.result).toBe(0);
  });

  it('calls onWarning for each missing STR tag', () => {
    const warnings: unknown[] = [];
    // Tagless game — all 7 STR tags missing
    const result = parse('1. e4 1-0', { onWarning: (w) => warnings.push(w) });
    expect(result).toHaveLength(1);
    expect(warnings).toHaveLength(7);
    expect(warnings[0]).toMatchObject({
      column: 1,
      line: 1,
      message: expect.stringMatching(/^Missing STR tag:/),
      offset: 0,
    });
  });

  it('does not call onWarning when all STR tags are present', () => {
    const warnings: unknown[] = [];
    const pgn =
      '[Event "E"]\n[Site "S"]\n[Date "2000.01.01"]\n[Round "1"]\n' +
      '[White "W"]\n[Black "B"]\n[Result "1-0"]\n\n1. e4 1-0';
    parse(pgn, { onWarning: (w) => warnings.push(w) });
    expect(warnings).toHaveLength(0);
  });

  it('does not throw when onWarning is omitted', () => {
    expect(() => parse('1. e4 1-0')).not.toThrow();
  });

  it('calls onWarning for a move number mismatch', () => {
    const warnings: unknown[] = [];
    // Move numbers are wrong — 1. e4 is labelled as move 5
    const pgn =
      '[Event "E"]\n[Site "S"]\n[Date "2000.01.01"]\n[Round "1"]\n' +
      '[White "W"]\n[Black "B"]\n[Result "1-0"]\n\n5. e4 e5 1-0';
    const result = parse(pgn, { onWarning: (w) => warnings.push(w) });
    expect(result).toHaveLength(1);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      column: 1,
      line: 1,
      message: 'Move number mismatch: expected 1, got 5',
      offset: 0,
    });
  });

  it('calls onWarning when Result tag does not match termination marker', () => {
    const warnings: unknown[] = [];
    // Tag says 1/2-1/2 but game ends with 1-0
    const pgn =
      '[Event "E"]\n[Site "S"]\n[Date "2000.01.01"]\n[Round "1"]\n' +
      '[White "W"]\n[Black "B"]\n[Result "1/2-1/2"]\n\n1. e4 1-0';
    const result = parse(pgn, { onWarning: (w) => warnings.push(w) });
    expect(result).toHaveLength(1);
    // Only the result mismatch warning — no missing STR warnings (all present)
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      column: 1,
      line: 1,
      message:
        'Result tag "1/2-1/2" does not match game termination marker "1-0"',
      offset: 0,
    });
  });

  it('does not call onWarning when Result tag matches termination marker', () => {
    const warnings: unknown[] = [];
    const pgn =
      '[Event "E"]\n[Site "S"]\n[Date "2000.01.01"]\n[Round "1"]\n' +
      '[White "W"]\n[Black "B"]\n[Result "1-0"]\n\n1. e4 1-0';
    parse(pgn, { onWarning: (w) => warnings.push(w) });
    // All 7 STR tags present and matching — zero warnings expected
    expect(warnings).toHaveLength(0);
  });

  it('does not warn about Result mismatch when Result tag is absent', () => {
    const warnings: unknown[] = [];
    // No tags at all — only STR missing warnings, not a result mismatch
    parse('1. e4 1-0', { onWarning: (w) => warnings.push(w) });
    expect(
      warnings.every(
        (w) =>
          typeof w === 'object' &&
          w !== null &&
          (w as { message: string }).message.startsWith('Missing STR tag:'),
      ),
    ).toBe(true);
  });

  it('calls onWarning for a duplicate tag name', () => {
    const warnings: unknown[] = [];
    const pgn =
      '[Event "First"]\n[Event "Second"]\n[Result "1-0"]\n\n1. e4 1-0';
    const result = parse(pgn, { onWarning: (w) => warnings.push(w) });
    expect(result).toHaveLength(1);
    // Last-write-wins: meta.Event should be "Second"
    expect(result[0]?.meta['Event']).toBe('Second');
    expect(
      warnings.some(
        (w) =>
          typeof w === 'object' &&
          w !== null &&
          /Duplicate tag.*Event/.test((w as { message: string }).message),
      ),
    ).toBe(true);
  });

  it('reports exact line and column for the duplicate tag', () => {
    const warnings: unknown[] = [];
    // Line 1: [Event "First"], line 2: [Event "Second"] — duplicate is at line 2, col 1
    const pgn =
      '[Event "First"]\n[Event "Second"]\n[Result "1-0"]\n\n1. e4 1-0';
    parse(pgn, { onWarning: (w) => warnings.push(w) });
    interface Warning {
      column: number;
      line: number;
      message: string;
      offset: number;
    }
    const dupe = (warnings as Warning[]).find((w) =>
      /Duplicate tag.*Event/.test(w.message),
    );
    expect(dupe).toBeDefined();
    expect(dupe?.line).toBe(2);
    expect(dupe?.column).toBe(1);
  });

  it('calls onError with parse error information', () => {
    const errors: unknown[] = [];
    // "XBAD" starts at offset 0, line 1, column 1 — gives a concrete anchor
    const result = parse('XBAD', {
      onError: (error) => errors.push(error),
    });
    expect(result).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      column: 1,
      line: 1,
      message: expect.stringMatching(/Expected|expected/i),
      offset: 0,
    });
  });
});

describe('comment commands', () => {
  it('parses [%cal] single arrow', () => {
    const pgn = '1. e4 { [%cal Ge2e4] } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.arrows).toEqual([
      { color: 'G', from: 'e2', to: 'e4' },
    ]);
  });

  it('parses [%cal] multiple arrows with mixed colours', () => {
    const pgn = '1. e4 { [%cal Ge2e4,Ra1h1,Gb1b8] } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.arrows).toEqual([
      { color: 'G', from: 'e2', to: 'e4' },
      { color: 'R', from: 'a1', to: 'h1' },
      { color: 'G', from: 'b1', to: 'b8' },
    ]);
  });

  it('parses [%csl] single square', () => {
    const pgn = '1. e4 { [%csl Rd4] } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.squares).toEqual([
      { color: 'R', square: 'd4' },
    ]);
  });

  it('parses [%csl] multiple squares', () => {
    const pgn = '1. e4 { [%csl Rd4,Ge5,Yf6] } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.squares).toEqual([
      { color: 'R', square: 'd4' },
      { color: 'G', square: 'e5' },
      { color: 'Y', square: 'f6' },
    ]);
  });

  it('parses [%csl] and [%cal] in the same comment', () => {
    const pgn = '1. e4 { [%csl Ga1][%cal Ra1h1,Gb1b8] } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.squares).toEqual([
      { color: 'G', square: 'a1' },
    ]);
    expect(result[0]?.moves[0]?.[1]?.arrows).toEqual([
      { color: 'R', from: 'a1', to: 'h1' },
      { color: 'G', from: 'b1', to: 'b8' },
    ]);
  });

  it('parses [%clk] to seconds', () => {
    const pgn = '1. e4 { [%clk 3:25:45] } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.clock).toBe(12_345);
  });

  it('parses [%clk] with sub-second precision', () => {
    const pgn = '1. e4 { [%clk 0:00:01.234] } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.clock).toBe(1.234);
  });

  it('parses [%eval] centipawn score', () => {
    const pgn = '1. e4 { [%eval -0.80] } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.eval).toEqual({ type: 'cp', value: -0.8 });
  });

  it('parses [%eval] mate with depth', () => {
    const pgn = '1. e4 { [%eval #1,5] } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.eval).toEqual({
      type: 'mate',
      value: 1,
      depth: 5,
    });
  });

  it('parses [%eval] negative mate', () => {
    const pgn = '1. e4 { [%eval #-2] } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.eval).toEqual({ type: 'mate', value: -2 });
  });

  it('[%eval] centipawn values 199-219 round-trip losslessly', () => {
    for (let cp = 199; cp <= 219; cp++) {
      const value = cp / 100;
      const pgn = `1. e4 { [%eval ${value.toFixed(2)}] } e5 1-0`;
      const result = parse(pgn);
      expect(result[0]?.moves[0]?.[1]?.eval).toEqual({ type: 'cp', value });
    }
  });

  it('strips commands from comment text', () => {
    const pgn = '1. e4 { Great move! [%cal Ge2e4] } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.comment).toBe('Great move!');
    expect(result[0]?.moves[0]?.[1]?.arrows).toEqual([
      { color: 'G', from: 'e2', to: 'e4' },
    ]);
  });

  it('omits comment field when only commands are present', () => {
    const pgn = '1. e4 { [%clk 1:00:00] } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.clock).toBe(3600);
    expect(result[0]?.moves[0]?.[1]?.comment).toBeUndefined();
  });

  it('leaves unknown commands in the comment string', () => {
    const pgn = '1. e4 { foo [%bar 1,2] baz } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.comment).toBe('foo [%bar 1,2] baz');
  });

  it('leaves malformed [%cal] token in comment and parses valid tokens', () => {
    const pgn = '1. e4 { [%cal ZZZ,Ge2e4] } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.arrows).toEqual([
      { color: 'G', from: 'e2', to: 'e4' },
    ]);
  });

  it('parses [%cal] with lowercase colour code', () => {
    const pgn = '1. e4 { [%cal ge2e4] } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.arrows).toEqual([
      { color: 'G', from: 'e2', to: 'e4' },
    ]);
  });

  it('parses [%cal] with spaces after commas', () => {
    const pgn = '1. e4 { [%cal Ge2e4, Ra1h1] } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.arrows).toEqual([
      { color: 'G', from: 'e2', to: 'e4' },
      { color: 'R', from: 'a1', to: 'h1' },
    ]);
  });

  it('parses [%csl] with orange and cyan color codes', () => {
    const pgn = '1. e4 { [%csl Oe1,Cb1] } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.squares).toEqual([
      { color: 'O', square: 'e1' },
      { color: 'C', square: 'b1' },
    ]);
  });

  it('parses [%cal] with orange and cyan color codes', () => {
    const pgn = '1. e4 { [%cal Oc1c7,Ch1h7] } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.arrows).toEqual([
      { color: 'O', from: 'c1', to: 'c7' },
      { color: 'C', from: 'h1', to: 'h7' },
    ]);
  });

  it('strips empty [%csl ] from comment without producing squares', () => {
    const pgn = '1. e4 { [%csl ][%cal Ye4e8] } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.squares).toBeUndefined();
    expect(result[0]?.moves[0]?.[1]?.arrows).toEqual([
      { color: 'Y', from: 'e4', to: 'e8' },
    ]);
    expect(result[0]?.moves[0]?.[1]?.comment).toBeUndefined();
  });

  it('strips empty [%cal ] from comment without producing arrows', () => {
    const pgn = '1. e4 { [%csl Ge5][%cal ] } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.arrows).toBeUndefined();
    expect(result[0]?.moves[0]?.[1]?.squares).toEqual([
      { color: 'G', square: 'e5' },
    ]);
    expect(result[0]?.moves[0]?.[1]?.comment).toBeUndefined();
  });

  // Group 1: Blue color code
  it('parses [%csl] with all six color codes', () => {
    const pgn = '1. e4 { [%csl Ye4,Rd4,Ga1,Bh1,Oe1,Cb1] } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.squares).toEqual([
      { color: 'Y', square: 'e4' },
      { color: 'R', square: 'd4' },
      { color: 'G', square: 'a1' },
      { color: 'B', square: 'h1' },
      { color: 'O', square: 'e1' },
      { color: 'C', square: 'b1' },
    ]);
  });

  it('parses [%cal] with all six color codes', () => {
    const pgn = '1. e4 { [%cal Ye4e8,Rd4a4,Ga1h8,Bh1c7,Oc1c7,Ch1h7] } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.arrows).toEqual([
      { color: 'Y', from: 'e4', to: 'e8' },
      { color: 'R', from: 'd4', to: 'a4' },
      { color: 'G', from: 'a1', to: 'h8' },
      { color: 'B', from: 'h1', to: 'c7' },
      { color: 'O', from: 'c1', to: 'c7' },
      { color: 'C', from: 'h1', to: 'h7' },
    ]);
  });

  // Group 2: Both cal and csl empty simultaneously
  it('strips both empty [%csl ] and [%cal ] with no output', () => {
    const pgn = '1. e4 { [%csl ][%cal ] } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.squares).toBeUndefined();
    expect(result[0]?.moves[0]?.[1]?.arrows).toBeUndefined();
    expect(result[0]?.moves[0]?.[1]?.comment).toBeUndefined();
  });

  // Group 3: Extra whitespace inside command brackets
  it('handles extra whitespace inside [%csl] and [%cal] brackets', () => {
    const pgn = '1. e4 { [%csl   Rd4 ] [%cal   Ye4e8  ,  Gd1d3]  } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.squares).toEqual([
      { color: 'R', square: 'd4' },
    ]);
    expect(result[0]?.moves[0]?.[1]?.arrows).toEqual([
      { color: 'Y', from: 'e4', to: 'e8' },
      { color: 'G', from: 'd1', to: 'd3' },
    ]);
    expect(result[0]?.moves[0]?.[1]?.comment).toBeUndefined();
  });

  // Group 4: Text immediately after ] with no space
  it('parses command followed immediately by text without leading space', () => {
    const pgn = '1. e4 { [%cal Ye4e8] comment } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.arrows).toEqual([
      { color: 'Y', from: 'e4', to: 'e8' },
    ]);
    expect(result[0]?.moves[0]?.[1]?.comment).toBe('comment');
  });

  // Group 5: Sub-second clock with 1 fractional digit
  it('parses [%clk] with 1-digit fractional seconds', () => {
    const pgn = '1. e4 { [%clk 0:00:59.8] } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.clock).toBe(59.8);
  });

  // Group 6: Unknown time commands left in comment
  it('leaves [%egt], [%emt], [%mct] in comment as unknown commands', () => {
    const pgn = '1. e4 { [%clk 0:10:10] [%egt 0:10:10] [%emt 0:08:08] } e5 1-0';
    const result = parse(pgn);
    expect(result[0]?.moves[0]?.[1]?.clock).toBe(610);
    expect(result[0]?.moves[0]?.[1]?.comment).toBe(
      '[%egt 0:10:10] [%emt 0:08:08]',
    );
  });
});
