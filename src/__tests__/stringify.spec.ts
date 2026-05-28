import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parse, stringify } from '../index.js';

function readFile(path: string): string {
  const filename = require.resolve(path);
  return readFileSync(filename, 'utf8');
}

describe('stringify', () => {
  describe('tags', () => {
    it('emits STR tags first in spec order', () => {
      const pgn =
        '[Event "Test"]\n[Site "??"]\n[Date "2024.01.01"]\n[Round "1"]\n[White "A"]\n[Black "B"]\n[Result "1-0"]\n\n1. e4 1-0';
      const result = parse(pgn);
      const output = stringify(result);
      const lines = output.split('\n');
      expect(lines[0]).toBe('[Event "Test"]');
      expect(lines[1]).toBe('[Site "??"]');
      expect(lines[2]).toBe('[Date "2024.01.01"]');
      expect(lines[3]).toBe('[Round "1"]');
      expect(lines[4]).toBe('[White "A"]');
      expect(lines[5]).toBe('[Black "B"]');
      expect(lines[6]).toBe('[Result "1-0"]');
    });

    it('emits extra tags after STR in alphabetical order', () => {
      const pgn =
        '[Event "Test"]\n[Site "?"]\n[Date "?"]\n[Round "?"]\n[White "?"]\n[Black "?"]\n[Result "*"]\n[Zebra "last"]\n[Annotator "first"]\n\n*';
      const result = parse(pgn);
      const output = stringify(result);
      const lines = output.split('\n');
      expect(lines[7]).toBe('[Annotator "first"]');
      expect(lines[8]).toBe('[Zebra "last"]');
    });

    it('escapes quotes and backslashes in tag values', () => {
      const pgn =
        String.raw`[Event "\"Café\""]` + '\n[Result "1-0"]\n\n1. e4 1-0';
      const [game] = parse(pgn);
      const output = stringify(game!);
      expect(output).toContain(String.raw`[Event "\"Café\""]`);
      // round-trip: the re-parsed tag value must match the original
      const [roundTripped] = parse(output);
      expect(roundTripped!.meta['Event']).toBe(game!.meta['Event']);
    });

    it('escapes a backslash in tag values', () => {
      const pgn = '[Event "a\\\\b"]\n[Result "1-0"]\n\n1. e4 1-0';
      const [game] = parse(pgn);
      // After parsing, the value is a\b (unescaped).
      // stringify must re-escape the backslash so the output is valid PGN.
      expect(game!.meta['Event']).toBe(String.raw`a\b`);
      const output = stringify(game!);
      expect(output).toContain(String.raw`[Event "a\\b"]`);
    });

    it('omits tags with undefined values', () => {
      const pgn = '1. e4 1-0';
      const result = parse(pgn);
      const output = stringify(result);
      expect(output).not.toContain('[Event');
    });

    it('emits correct result termination markers', () => {
      const cases: [string, string][] = [
        ['1-0', '1-0'],
        ['0-1', '0-1'],
        ['1/2-1/2', '1/2-1/2'],
        ['*', '*'],
      ];
      for (const [tag, marker] of cases) {
        const pgn = `[Result "${tag}"]\n\n${marker}`;
        const [game] = parse(pgn);
        expect(stringify(game!)).toContain(marker);
      }
    });
  });

  describe('SAN reconstruction', () => {
    // eslint-disable-next-line unicorn/consistent-function-scoping
    function stringifyFirstWhiteMove(san: string): string {
      const pgn = `1. ${san} e5 1-0`;
      const [game] = parse(pgn);
      const output = stringify(game!);
      // movetext is after the blank line following tags (or after first \n\n)
      const movetext = output.split('\n\n').at(-1)!;
      return movetext.split(' ')[1]!;
    }

    it('serializes a simple piece move', () => {
      expect(stringifyFirstWhiteMove('Nf3')).toBe('Nf3');
    });

    it('serializes a pawn push', () => {
      expect(stringifyFirstWhiteMove('e4')).toBe('e4');
    });

    it('serializes a piece capture', () => {
      expect(stringifyFirstWhiteMove('Nxf3')).toBe('Nxf3');
    });

    it('serializes a pawn capture', () => {
      const pgn = '1. e4 d5 2. exd5 1-0';
      const [game] = parse(pgn);
      expect(stringify(game!)).toContain('exd5');
    });

    it('serializes kingside castling', () => {
      const pgn = '1. e4 e5 2. Nf3 Nf6 3. Bc4 Bc5 4. O-O 1-0';
      const [game] = parse(pgn);
      expect(stringify(game!)).toContain('O-O');
    });

    it('serializes queenside castling without confusing with kingside', () => {
      const pgn = '1. d4 d5 2. Nc3 Nc6 3. Bf4 Bf5 4. Qd2 Qd7 5. O-O-O 1-0';
      const [game] = parse(pgn);
      const output = stringify(game!);
      expect(output).toContain('O-O-O');
    });

    it('serializes promotion', () => {
      const pgn = '[Result "1-0"]\n\n1. e8=Q 1-0';
      const [game] = parse(pgn);
      expect(stringify(game!)).toContain('e8=Q');
    });

    it('serializes check indicator', () => {
      const pgn = '1. e4 e5 2. Qh5+ 1-0';
      const [game] = parse(pgn);
      expect(stringify(game!)).toContain('Qh5+');
    });

    it('serializes checkmate indicator', () => {
      const pgn = '1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0';
      const [game] = parse(pgn);
      expect(stringify(game!)).toContain('Qxf7#');
    });

    it('serializes file disambiguation', () => {
      const pgn = '1. Nbd7 1-0';
      const [game] = parse(pgn);
      expect(stringify(game!)).toContain('Nbd7');
    });

    it('serializes rank disambiguation', () => {
      const pgn = '1. N1f3 1-0';
      const [game] = parse(pgn);
      expect(stringify(game!)).toContain('N1f3');
    });

    it('serializes full-square disambiguation', () => {
      const pgn = '1. Nb1d2 1-0';
      const [game] = parse(pgn);
      expect(stringify(game!)).toContain('Nb1d2');
    });
  });

  describe('move numbers', () => {
    it('always prefixes white moves with N.', () => {
      const pgn = '1. e4 e5 2. Nf3 1-0';
      const [game] = parse(pgn);
      const output = stringify(game!);
      expect(output).toContain('1. e4');
      expect(output).toContain('2. Nf3');
    });

    it('prefixes black move with N... only after annotation between white and black', () => {
      const pgn = '1. e4 { comment } 1... e5 1-0';
      const [game] = parse(pgn);
      const output = stringify(game!);
      expect(output).toContain('1...');
    });

    it('does not prefix black move with N... when no annotation between', () => {
      const pgn = '1. e4 e5 1-0';
      const [game] = parse(pgn);
      const output = stringify(game!);
      expect(output).not.toContain('1...');
    });
  });

  describe('NAGs', () => {
    it('serializes a single NAG after the move', () => {
      const pgn = '1. e4 $1 e5 1-0';
      const [game] = parse(pgn);
      expect(stringify(game!)).toContain('e4 $1');
    });

    it('serializes multiple NAGs after the move', () => {
      const pgn = '1. e4 $1 $6 e5 1-0';
      const [game] = parse(pgn);
      expect(stringify(game!)).toContain('e4 $1 $6');
    });
  });

  describe('comments and annotations', () => {
    it('serializes a plain comment', () => {
      const pgn = '1. e4 { great move } e5 1-0';
      const [game] = parse(pgn);
      expect(stringify(game!)).toContain('{ great move }');
    });

    it('serializes [%cal] arrows', () => {
      const pgn = '1. e4 { [%cal Ge2e4] } e5 1-0';
      const [game] = parse(pgn);
      expect(stringify(game!)).toContain('[%cal Ge2e4]');
    });

    it('serializes [%csl] squares', () => {
      const pgn = '1. e4 { [%csl Rd4] } e5 1-0';
      const [game] = parse(pgn);
      expect(stringify(game!)).toContain('[%csl Rd4]');
    });

    it('serializes [%clk] clock from seconds', () => {
      const pgn = '1. e4 { [%clk 1:00:00] } e5 1-0';
      const [game] = parse(pgn);
      expect(stringify(game!)).toContain('[%clk 1:00:00]');
    });

    it('serializes [%clk] with sub-second precision', () => {
      const pgn = '1. e4 { [%clk 0:00:01.5] } e5 1-0';
      const [game] = parse(pgn);
      expect(stringify(game!)).toContain('[%clk 0:00:01.5]');
    });

    it('serializes [%eval] centipawn', () => {
      const pgn = '1. e4 { [%eval 0.82] } e5 1-0';
      const [game] = parse(pgn);
      expect(stringify(game!)).toContain('[%eval 0.82]');
    });

    it('serializes [%eval] mate', () => {
      const pgn = '1. e4 { [%eval #3] } e5 1-0';
      const [game] = parse(pgn);
      expect(stringify(game!)).toContain('[%eval #3]');
    });

    it('serializes [%eval] mate with depth', () => {
      const pgn = '1. e4 { [%eval #1,5] } e5 1-0';
      const [game] = parse(pgn);
      expect(stringify(game!)).toContain('[%eval #1,5]');
    });

    it('serializes all annotation commands and text together', () => {
      const pgn =
        '1. e4 { [%cal Ge2e4] [%csl Rd4] [%clk 0:10:00] [%eval 0.50] good move } e5 1-0';
      const [game] = parse(pgn);
      const output = stringify(game!);
      expect(output).toContain('[%cal Ge2e4]');
      expect(output).toContain('[%csl Rd4]');
      expect(output).toContain('[%clk 0:10:00]');
      expect(output).toContain('[%eval 0.50]');
      expect(output).toContain('good move');
    });

    it('emits no comment block when move has no annotations', () => {
      const pgn = '1. e4 e5 1-0';
      const [game] = parse(pgn);
      expect(stringify(game!)).not.toContain('{');
    });
  });

  describe('RAVs', () => {
    it('serializes a single variation', () => {
      const pgn = '1. e4 (1. d4 d5) e5 1-0';
      const [game] = parse(pgn);
      expect(stringify(game!)).toContain('(1. d4');
    });

    it('serializes nested variations', () => {
      const pgn = '1. e4 (1. d4 (1. c4 c5) d5) e5 1-0';
      const [game] = parse(pgn);
      expect(stringify(game!)).toContain('(1. c4');
    });
  });

  describe('warnings', () => {
    it('serializes castling based on long flag, ignoring to square', () => {
      const [game] = parse('1. e4 e5 1-0');
      const move = game!.moves[0]![1]!;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (move as any).castling = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (move as any).long = true;
      const output = stringify(game!);
      expect(output).toContain('O-O-O');
    });

    it('fires onWarning for negative clock and clamps output to 0:00:00', () => {
      const warnings: string[] = [];
      const [game] = parse('1. e4 { [%clk 0:01:00] } e5 1-0');
      game!.moves[0]![1]!.clock = -5;
      const output = stringify(game!, {
        onWarning: (w) => warnings.push(w.message),
      });
      expect(warnings.length).toBeGreaterThan(0);
      expect(output).toContain('[%clk 0:00:00]');
    });
  });

  describe('multiple games', () => {
    it('separates multiple games with a blank line', () => {
      const pgn = '[Result "1-0"]\n\n1. e4 1-0\n\n[Result "0-1"]\n\n1. d4 0-1';
      const games = parse(pgn);
      const output = stringify(games);
      expect(output.split('[Result').length).toBe(3);
    });
  });

  describe('clock serialization edge cases', () => {
    it('serializes clock with fractional seconds and non-zero minutes', () => {
      // 100.1 seconds = 0:01:40.1
      const [game] = parse('1. e4 { [%clk 0:00:01.5] } e5 1-0');
      game!.moves[0]![1]!.clock = 100.1;
      expect(stringify(game!)).toContain('[%clk 0:01:40.1]');
    });

    it('serializes clock near hour boundary with fractional seconds', () => {
      // 3599.9 seconds = 0:59:59.9
      const [game] = parse('1. e4 { [%clk 0:00:01.5] } e5 1-0');
      game!.moves[0]![1]!.clock = 3599.9;
      expect(stringify(game!)).toContain('[%clk 0:59:59.9]');
    });

    it('serializes no-moves game without leading space before result', () => {
      const pgn = '[Result "*"]\n\n*';
      const [game] = parse(pgn);
      const output = stringify(game!);
      // Result marker should not be preceded by a space when there are no moves
      expect(output).toContain('[Result "*"]\n\n*\n');
      expect(output).not.toContain(' *\n');
    });
  });

  describe('round-trip', () => {
    const fixtures = [
      'basic',
      'benko',
      'checkmate',
      'comment',
      'comments',
      'games32',
      'lichess',
      'long',
      'multiple-game',
      'promotion',
      'single',
      'twic',
      'variants',
    ] as const;

    for (const label of fixtures) {
      it(
        `parse → stringify → parse produces equivalent games for ${label}.pgn`,
        { timeout: 15_000 },
        () => {
          const pgn = readFile(`./grammar/${label}.pgn`);
          const original = parse(pgn);
          const roundTripped = parse(stringify(original));
          expect(roundTripped).toHaveLength(original.length);
          for (const [index, element] of original.entries()) {
            expect(roundTripped[index]!.result).toBe(element!.result);
            expect(roundTripped[index]!.moves).toHaveLength(
              element!.moves.length,
            );
          }
        },
      );
    }
  });
});
