/**
 * Explicit unit tests for SAN move parsing.
 *
 * These complement the snapshot tests by asserting the exact output shape for
 * each grammar alternative. Snapshots catch regressions but silently bake in
 * bugs present at generation time — these tests pin the correct behaviour from
 * first principles.
 *
 * Each test parses a minimal single-game PGN and inspects the first white move
 * (moves[0][1]) or first black move (moves[0][2]).
 */

import { describe, expect, it } from 'vitest';

import { parse } from '../index.js';

/** Parse a move string as white's first move and return the Notation object. */
function white(san: string) {
  const games = parse(`[Event "T"]\n[Result "1-0"]\n\n1. ${san} 1-0`);
  return games[0]?.moves[0]?.[1];
}

/** Parse a move string as black's first move and return the Notation object. */
function black(san: string) {
  const games = parse(`[Event "T"]\n[Result "1-0"]\n\n1. e4 ${san} 1-0`);
  return games[0]?.moves[0]?.[2];
}

// ─── CASTLING ────────────────────────────────────────────────────────────────

describe('CASTLING', () => {
  it('O-O (white) → kingside, to g1', () => {
    expect(white('O-O')).toMatchObject({
      castling: true,
      check: false,
      checkmate: false,
      long: false,
      piece: 'king',
      to: 'g1',
    });
  });

  it('O-O-O (white) → queenside, to c1', () => {
    expect(white('O-O-O')).toMatchObject({
      castling: true,
      long: true,
      piece: 'king',
      to: 'c1',
    });
  });

  it('O-O (black) → kingside, to g8', () => {
    expect(black('O-O')).toMatchObject({
      castling: true,
      long: false,
      piece: 'king',
      to: 'g8',
    });
  });

  it('O-O-O (black) → queenside, to c8', () => {
    expect(black('O-O-O')).toMatchObject({
      castling: true,
      long: true,
      piece: 'king',
      to: 'c8',
    });
  });

  it('O-O+ → check: true', () => {
    expect(white('O-O+')).toMatchObject({
      castling: true,
      check: true,
      checkmate: false,
      to: 'g1',
    });
  });

  it('O-O# → checkmate: true', () => {
    expect(white('O-O#')).toMatchObject({
      castling: true,
      check: false,
      checkmate: true,
      to: 'g1',
    });
  });

  it('O-O-O+ → check: true', () => {
    expect(white('O-O-O+')).toMatchObject({
      castling: true,
      check: true,
      to: 'c1',
    });
  });

  it('O-O-O# → checkmate: true', () => {
    expect(white('O-O-O#')).toMatchObject({
      castling: true,
      checkmate: true,
      to: 'c1',
    });
  });
});

// ─── PIECE_MOVE ──────────────────────────────────────────────────────────────

describe('PIECE_MOVE', () => {
  it('simple: Nf3', () => {
    expect(white('Nf3')).toMatchObject({
      capture: false,
      castling: false,
      check: false,
      checkmate: false,
      from: undefined,
      long: false,
      piece: 'knight',
      promotion: undefined,
      to: 'f3',
    });
  });

  it('simple + check: Qh5+', () => {
    expect(white('Qh5+')).toMatchObject({
      check: true,
      piece: 'queen',
      to: 'h5',
    });
  });

  it('simple + checkmate: Qf8#', () => {
    expect(white('Qf8#')).toMatchObject({
      checkmate: true,
      piece: 'queen',
      to: 'f8',
    });
  });

  it('simple capture: Nxe4', () => {
    expect(white('Nxe4')).toMatchObject({
      capture: true,
      piece: 'knight',
      to: 'e4',
    });
  });

  it('simple capture + check: Bxf7+', () => {
    expect(white('Bxf7+')).toMatchObject({
      capture: true,
      check: true,
      piece: 'bishop',
      to: 'f7',
    });
  });

  it('simple capture + checkmate: Qxf7#', () => {
    expect(white('Qxf7#')).toMatchObject({
      capture: true,
      checkmate: true,
      piece: 'queen',
      to: 'f7',
    });
  });

  it('file disambig, no capture: Nbd7', () => {
    expect(white('Nbd7')).toMatchObject({
      from: 'b',
      piece: 'knight',
      to: 'd7',
    });
  });

  it('file disambig, no capture + check: Rag7+', () => {
    expect(white('Rag7+')).toMatchObject({
      check: true,
      from: 'a',
      piece: 'rook',
      to: 'g7',
    });
  });

  it('file disambig, no capture + checkmate: Rag2#', () => {
    expect(white('Rag2#')).toMatchObject({
      checkmate: true,
      from: 'a',
      piece: 'rook',
      to: 'g2',
    });
  });

  it('file disambig + capture: Nbxd4', () => {
    expect(white('Nbxd4')).toMatchObject({
      capture: true,
      from: 'b',
      piece: 'knight',
      to: 'd4',
    });
  });

  it('file disambig + capture + check: Rexf2+', () => {
    expect(white('Rexf2+')).toMatchObject({
      capture: true,
      check: true,
      from: 'e',
      piece: 'rook',
      to: 'f2',
    });
  });

  it('file disambig + capture + checkmate: Qexg6#', () => {
    expect(white('Qexg6#')).toMatchObject({
      capture: true,
      checkmate: true,
      from: 'e',
      piece: 'queen',
      to: 'g6',
    });
  });

  it('rank disambig, no capture: N5c3', () => {
    expect(white('N5c3')).toMatchObject({
      from: '5',
      piece: 'knight',
      to: 'c3',
    });
  });

  it('rank disambig, no capture + check: R2f3+', () => {
    expect(white('R2f3+')).toMatchObject({
      check: true,
      from: '2',
      piece: 'rook',
      to: 'f3',
    });
  });

  it('rank disambig + capture: R8xa4', () => {
    expect(white('R8xa4')).toMatchObject({
      capture: true,
      from: '8',
      piece: 'rook',
      to: 'a4',
    });
  });

  it('rank disambig + capture + check: R8xf2+', () => {
    expect(white('R8xf2+')).toMatchObject({
      capture: true,
      check: true,
      from: '8',
      piece: 'rook',
      to: 'f2',
    });
  });

  it('full-square disambig, no capture: Rd1d2', () => {
    expect(white('Rd1d2')).toMatchObject({
      from: 'd1',
      piece: 'rook',
      to: 'd2',
    });
  });

  it('full-square disambig, no capture + check: Rd1f1+', () => {
    expect(white('Rd1f1+')).toMatchObject({
      check: true,
      from: 'd1',
      piece: 'rook',
      to: 'f1',
    });
  });

  it('full-square disambig + capture: Qd1xe4', () => {
    expect(white('Qd1xe4')).toMatchObject({
      capture: true,
      from: 'd1',
      piece: 'queen',
      to: 'e4',
    });
  });

  it('full-square disambig + capture + check: Qd1xf3+', () => {
    expect(white('Qd1xf3+')).toMatchObject({
      capture: true,
      check: true,
      from: 'd1',
      piece: 'queen',
      to: 'f3',
    });
  });
});

it('rejects promotion on a non-pawn piece: Nf3=Q', () => {
  expect(white('Nf3=Q')).toBeUndefined();
});

it('rejects promotion on a non-pawn capture: Nxf3=Q', () => {
  expect(white('Nxf3=Q')).toBeUndefined();
});

// ─── PAWN_PUSH ───────────────────────────────────────────────────────────────

describe('PAWN_PUSH', () => {
  it('plain: e4', () => {
    expect(white('e4')).toMatchObject({
      capture: false,
      castling: false,
      check: false,
      checkmate: false,
      from: undefined,
      long: false,
      piece: 'pawn',
      promotion: undefined,
      to: 'e4',
    });
  });

  it('with check: h5+', () => {
    expect(white('h5+')).toMatchObject({
      check: true,
      piece: 'pawn',
      to: 'h5',
    });
  });

  it('with checkmate: e6#', () => {
    expect(white('e6#')).toMatchObject({
      checkmate: true,
      piece: 'pawn',
      to: 'e6',
    });
  });

  it('promotion =Q: d8=Q', () => {
    expect(white('d8=Q')).toMatchObject({
      piece: 'pawn',
      promotion: 'queen',
      to: 'd8',
    });
  });

  it('promotion =Q + check: b8=Q+', () => {
    expect(white('b8=Q+')).toMatchObject({
      check: true,
      piece: 'pawn',
      promotion: 'queen',
      to: 'b8',
    });
  });

  it('promotion =Q + checkmate: a1=Q#', () => {
    expect(white('a1=Q#')).toMatchObject({
      checkmate: true,
      piece: 'pawn',
      promotion: 'queen',
      to: 'a1',
    });
  });

  it('underpromotion =N: a8=N', () => {
    expect(white('a8=N')).toMatchObject({
      piece: 'pawn',
      promotion: 'knight',
      to: 'a8',
    });
  });

  it('underpromotion =R: g1=R', () => {
    expect(white('g1=R')).toMatchObject({
      piece: 'pawn',
      promotion: 'rook',
      to: 'g1',
    });
  });

  it('underpromotion =B: h8=B', () => {
    expect(white('h8=B')).toMatchObject({
      piece: 'pawn',
      promotion: 'bishop',
      to: 'h8',
    });
  });

  it('underpromotion =N + check: f1=N+', () => {
    expect(white('f1=N+')).toMatchObject({
      check: true,
      piece: 'pawn',
      promotion: 'knight',
      to: 'f1',
    });
  });
});

// ─── NAG (nag_import) ────────────────────────────────────────────────────────

describe('NAG nag_import', () => {
  it('parses ! as annotation', () => {
    expect(white('e4!')).toMatchObject({
      annotations: ['!'],
      piece: 'pawn',
      to: 'e4',
    });
  });

  it('parses ?? as annotation', () => {
    expect(white('e4??')).toMatchObject({
      annotations: ['??'],
      piece: 'pawn',
      to: 'e4',
    });
  });

  it('parses ± (U+00B1) as annotation', () => {
    expect(white('e4\u00B1')).toMatchObject({
      annotations: ['\u00B1'],
      piece: 'pawn',
      to: 'e4',
    });
  });

  it('parses multiple NAGs on one move', () => {
    expect(white('e4!$14')).toMatchObject({
      annotations: ['!', '14'],
      piece: 'pawn',
      to: 'e4',
    });
  });
});

// ─── COMMENT ─────────────────────────────────────────────────────────────────

describe('COMMENT', () => {
  it('parses a semicolon comment_line', () => {
    const games = parse(
      '[Event "T"]\n[Result "1-0"]\n\n1. e4 ; this is a comment\n1-0',
    );
    expect(games[0]?.moves[0]?.[1]).toMatchObject({
      comment: 'this is a comment',
      piece: 'pawn',
      to: 'e4',
    });
  });

  it('joins multiple comment blocks on one move', () => {
    const games = parse(
      '[Event "T"]\n[Result "1-0"]\n\n1. e4 { first } { second } 1-0',
    );
    expect(games[0]?.moves[0]?.[1]).toMatchObject({
      comment: 'first second',
      piece: 'pawn',
      to: 'e4',
    });
  });
});

// ─── RAV ─────────────────────────────────────────────────────────────────────

describe('RAV', () => {
  it('parses a single variation on a move', () => {
    const games = parse(
      '[Event "T"]\n[Result "1-0"]\n\n1. e4 (1. d4 d5) e5 1-0',
    );
    const variants = games[0]?.moves[0]?.[1]?.variants;
    expect(variants).toHaveLength(1);
    expect(variants?.[0]?.[0]?.[1]).toMatchObject({ piece: 'pawn', to: 'd4' });
  });

  it('parses a nested RAV (RAV inside a RAV)', () => {
    const games = parse(
      '[Event "T"]\n[Result "1-0"]\n\n1. e4 (1. d4 (1. c4 c5) d5) e5 1-0',
    );
    const outer = games[0]?.moves[0]?.[1]?.variants?.[0];
    const inner = outer?.[0]?.[1]?.variants;
    expect(inner).toHaveLength(1);
    expect(inner?.[0]?.[0]?.[1]).toMatchObject({ piece: 'pawn', to: 'c4' });
  });

  it('parses a comment inside a RAV', () => {
    const games = parse(
      '[Event "T"]\n[Result "1-0"]\n\n1. e4 (1. d4 { good move } d5) e5 1-0',
    );
    const ravMove = games[0]?.moves[0]?.[1]?.variants?.[0]?.[0]?.[1];
    expect(ravMove).toMatchObject({
      comment: 'good move',
      piece: 'pawn',
      to: 'd4',
    });
  });
});

// ─── PAWN_CAPTURE ────────────────────────────────────────────────────────────

describe('PAWN_CAPTURE', () => {
  it('plain: cxd4', () => {
    expect(white('cxd4')).toMatchObject({
      capture: true,
      from: 'c',
      piece: 'pawn',
      to: 'd4',
    });
  });

  it('with check: fxg2+', () => {
    expect(white('fxg2+')).toMatchObject({
      capture: true,
      check: true,
      from: 'f',
      piece: 'pawn',
      to: 'g2',
    });
  });

  it('with checkmate: exd6#', () => {
    expect(white('exd6#')).toMatchObject({
      capture: true,
      checkmate: true,
      from: 'e',
      piece: 'pawn',
      to: 'd6',
    });
  });

  it('with promotion =Q: fxe8=Q', () => {
    expect(white('fxe8=Q')).toMatchObject({
      capture: true,
      from: 'f',
      piece: 'pawn',
      promotion: 'queen',
      to: 'e8',
    });
  });

  it('with promotion =Q + check: exf8=Q+', () => {
    expect(white('exf8=Q+')).toMatchObject({
      capture: true,
      check: true,
      from: 'e',
      piece: 'pawn',
      promotion: 'queen',
      to: 'f8',
    });
  });

  it('with promotion =Q + checkmate: exf8=Q#', () => {
    expect(white('exf8=Q#')).toMatchObject({
      capture: true,
      checkmate: true,
      from: 'e',
      piece: 'pawn',
      promotion: 'queen',
      to: 'f8',
    });
  });

  it('underpromotion capture + check: exf8=N+', () => {
    expect(white('exf8=N+')).toMatchObject({
      capture: true,
      check: true,
      from: 'e',
      piece: 'pawn',
      promotion: 'knight',
      to: 'f8',
    });
  });
});
