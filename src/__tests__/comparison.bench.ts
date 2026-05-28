// Package size comparison (as of 2026-03-17, measured with `npm pack --dry-run`):
//
// | Package                  | Pack size | Unpacked |
// |--------------------------|-----------|----------|
// | @echecs/pgn              |    42 KB  |  195 KB  |
// | pgn-parser               |    99 KB  |  606 KB  |
// | @mliebelt/pgn-parser     |   148 KB  |  595 KB  |
// | chess.js                 |   150 KB  |  724 KB  |

import { parseGame, parseGames } from '@mliebelt/pgn-parser';
import { Chess } from 'chess.js';
import { readFileSync } from 'node:fs';
import { parse as pgnParserParse } from 'pgn-parser';
import { bench, describe } from 'vitest';

import { parse } from '../index.js';

function readFile(path: string): string {
  const filename = require.resolve(path);
  // Strip BOM before passing to comparison parsers — @echecs/pgn handles it
  // internally, but pgn-parser and chess.js do not accept BOM-prefixed input.
  return readFileSync(filename, 'utf8').replace(/^\uFEFF/, '');
}

// Load all fixture files
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

// Single-game fixtures (all 4 parsers)
const singleGameFixtures = {
  basic,
  checkmate,
  comment,
  promotion,
  single,
  variants,
};

// Multi-game fixtures (exclude chess.js, which only handles one game at a time)
// benko.pgn: plain two-game file — moved here from singleGameFixtures so the
//   multi-game APIs (parseGames / pgnParserParse) are used for comparison.
// variants.pgn excluded: pgn-parser chokes on Unicode NAG symbols (e.g. ±);
//   chess.js does not support RAV sub-lines. No fair comparison possible.
const multiGameFixtures = {
  benko,
  comments,
  games32,
  lichess,
  long,
  multiple,
  twic,
};

// ============================================================================
// Single-game fixtures: compare all 4 parsers
// ============================================================================

for (const [label, input] of Object.entries(singleGameFixtures)) {
  describe(`single-game: ${label}`, () => {
    bench('@echecs/pgn', () => {
      parse(input);
    });

    bench('@mliebelt/pgn-parser', () => {
      parseGame(input);
    });

    bench('pgn-parser', () => {
      pgnParserParse(input);
    });

    bench('chess.js', () => {
      new Chess().loadPgn(input);
    });
  });
}

// ============================================================================
// Multi-game fixtures: exclude chess.js (only handles single game)
// ============================================================================

for (const [label, input] of Object.entries(multiGameFixtures)) {
  describe(`multi-game: ${label}`, () => {
    bench('@echecs/pgn', () => {
      parse(input);
    });

    bench('@mliebelt/pgn-parser', () => {
      parseGames(input);
    });

    bench('pgn-parser', () => {
      pgnParserParse(input);
    });
  });
}
