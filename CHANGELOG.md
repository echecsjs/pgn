# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [5.0.0] - 2026-05-28

### Changed

- **BREAKING:** `parse` is now a named export instead of the default export. Use
  `import { parse } from '@echecs/pgn'` instead of
  `import parse from '@echecs/pgn'`.
- **BREAKING:** renamed `Move` type to `Notation` to avoid confusion with
  coordinate moves.
- **BREAKING:** renamed `MovePair` to `NotationPair`.
- **BREAKING:** renamed `MoveList` to `NotationList`.
- `Variation` type definition updated to `NotationList[]` (name unchanged).
- Re-exported `PieceType` and `PromotionPieceType` from `@echecs/san` instead of
  the removed `Piece` and `PromotionPiece` aliases.

## [4.0.0] - 2026-04-27

### Changed

- `Move` now extends `SAN` from `@echecs/san` — all SAN fields are always
  present (no more optional `capture`, `check`, `checkmate`)
- `piece` values changed from uppercase chars to full words (`'P'` -> `'pawn'`,
  `'N'` -> `'knight'`, `'B'` -> `'bishop'`, `'R'` -> `'rook'`, `'Q'` ->
  `'queen'`, `'K'` -> `'king'`)
- `promotion` values changed from uppercase chars to full words (`'queen'`,
  `'rook'`, `'bishop'`, `'knight'`)
- `castling` changed from optional boolean to required boolean, with new `long`
  boolean field replacing destination-based detection
- `capture`, `check`, `checkmate` changed from optional to always present
  (default `false`)
- `to` is `undefined` for castling moves (destination square resolved
  internally)

### Added

- re-exports `Piece`, `PromotionPiece`, `SAN`, `Disambiguation`, `File`, `Rank`,
  `Square` from `@echecs/san`

### Removed

- `PieceChar` type (replaced by `Piece` from `@echecs/san`)

## [3.12.2] - 2026-04-09

### Changed

- updated description to mention stringify
- removed inaccurate `fide` keyword
- added `serializer` keyword

## [3.12.1] - 2026-04-09

### Fixed

- added missing type exports (`Disambiguation`, `File`, `PieceChar`, `Rank`,
  `Square`)
- replaced non-existent `Piece` type with `PieceChar`
- corrected `Move` field types (`boolean` not `true`)
- corrected `Move.promotion` type to `PieceChar`
- corrected `Arrow` and `SquareAnnotation` field types to `Square`

## [3.12.0] - 2026-03-18

### Fixed

- `stringify()` now escapes `\` and `"` in tag values. Previously, tag values
  containing these characters produced invalid PGN that could not be re-parsed
  (round-trip bug).

### Deprecated

- `stream()` is deprecated. Use `parse()` instead — it already handles
  multi-game input. `stream()` now emits a one-time `console.warn` on first call
  and will be removed in the next major version.

### Changed

- Internal refactoring: `parse.ts` and `stringify.ts` split into focused modules
  (`constants.ts`, `warnings.ts`, `comments.ts`, `san.ts`, `tags.ts`). No public
  API changes.
- Removed unreachable runtime guard on `move.to` in SAN serialization —
  `move.to: Square` is required by the type system.

## [3.11.0] - 2026-03-18

### Added

- `StringifyOptions` type exported — a focused subset of `ParseOptions`
  containing only `onWarning`. `stringify()` now accepts `StringifyOptions`
  instead of the broader `ParseOptions` (backwards compatible — any
  `ParseOptions` value is still valid).
- New exported types: `Meta`, `Move`, `MoveList`, `MovePair`, `Variation`,
  `Piece`, `Result`. Consumers can now type variables holding parsed game data
  without workarounds.

### Fixed

- `parse()` now uses `input.trim()` instead of
  `input.replaceAll(/^\s+|\s+$/g, '')` — semantically identical, cleaner.
- `%`-prefixed escape lines (`ESCAPE` rule per PGN spec §6) are now explicitly
  tested — both between moves and between games.
- `stream()` JSDoc clarified: `onWarning` is forwarded to `parse()` for each
  game, not only `onError`.

## [3.10.1] - 2026-03-17

### Changed

- Build tool replaced with `tsdown`. The published package now ships a single
  bundled, minified `dist/index.js` instead of multiple unbundled files.
  Published package size reduced from ~200KB to ~42KB (79% reduction).
  `dist/grammar.cjs.map` (84KB) is no longer published. Public API unchanged.

## [3.10.0] - 2026-03-17

### Added

- `stringify(input: PGN | PGN[], options?: StringifyOptions): string` — converts
  parsed PGN objects back to valid PGN strings (semantic round-trip fidelity).
  Accepts a single game or an array of games. Reconstructs SAN from `Move`
  fields, re-serializes annotation commands (`[%cal]`, `[%csl]`, `[%clk]`,
  `[%eval]`) back into comment blocks, and preserves RAVs and NAGs. Fires
  `onWarning` for recoverable issues (invalid castling destination, negative
  clock).

### Changed

- `src/index.ts` refactored into focused internal modules (`src/types.ts`,
  `src/parse.ts`, `src/stream.ts`, `src/stringify.ts`). Public API unchanged.

### Fixed

- Tagless games with no moves (e.g. `[Result "*"]\n\n*`) now parse correctly.
  Previously the grammar required at least one move in the movetext.

## [3.9.1] - 2026-03-16

### Fixed

- `AnnotationColor` now includes `'C'` (cyan) and `'O'` (orange) in addition to
  `'B'`, `'G'`, `'R'`, `'Y'` — matching real-world Lichess and ChessBase
  exports. Tokens with these colors were previously silently dropped.
- Empty `[%csl ]` and `[%cal ]` commands (with no token list) are now silently
  stripped from the comment text instead of leaking through as raw strings.

## [3.9.0] - 2026-03-16

### Added

- `Move` now exposes structured fields parsed from embedded PGN comment
  commands:
  - `arrows?: Arrow[]` — from `[%cal ...]` (coloured arrows on board)
  - `squares?: SquareAnnotation[]` — from `[%csl ...]` (coloured square
    highlights)
  - `clock?: number` — from `[%clk ...]` (remaining time in seconds, sub-second
    precision preserved)
  - `eval?: Eval` — from `[%eval ...]` (engine evaluation: centipawns or
    mate-in-N, with optional search depth)
- New exported types: `AnnotationColor`, `Arrow`, `SquareAnnotation`, `Eval`
- Command strings are stripped from `move.comment`; unknown `[%...]` commands
  are left in the comment string unchanged
- De-facto standard followed:
  [python-chess](https://python-chess.readthedocs.io/en/latest/pgn.html)

## [3.8.3] - 2026-03-15

### Added

- `stream()` now accepts a Web Streams `ReadableStream<string>` in addition to
  `AsyncIterable<string>`. This covers
  `fetch().body.pipeThrough(new TextDecoderStream())` in browser and edge
  runtimes. The type signature is widened accordingly — no behaviour change for
  existing `AsyncIterable` callers.

## [3.8.2] - 2026-03-15

### Fixed

- `comment_multiline` now handles one level of nested braces
  (`{ see {Fischer} 1972 }`). Previously the comment terminated at the first
  `}`, causing the rest of the game to fail to parse. Real-world PGN from GUI
  exports commonly contains embedded `{…}` spans inside comments.

## [3.8.1] - 2026-03-15

### Fixed

- `PIECE_MOVE` no longer accepts promotion syntax (`=Q`, `=N`, etc.) on non-pawn
  pieces. `Nf3=Q` previously parsed silently and produced a `Move` object with a
  nonsensical `promotion` field; it now causes a parse failure. Only `PAWN_PUSH`
  and `PAWN_CAPTURE` accept the `PROMO` suffix, as required by the PGN spec.
- `Meta.Result` is now typed as optional (`Result?: Result`) to reflect that
  tagless games (no tag pairs) return `meta: {}` with no `Result` key. The field
  was previously typed as required, which was incorrect at runtime.

## [3.8.0] - 2026-03-15

### Added

- `onWarning` now fires for move number mismatches (e.g. `5. e4` appearing as
  the first move). Previously emitted unconditionally to `console.warn`; now
  routed through `onWarning` when provided. `console.warn` is no longer called
  for move number mismatches — if you relied on it, add an `onWarning` callback.
- `onWarning` fires when the `[Result "..."]` tag value does not match the game
  termination marker at the end of the movetext (e.g. `[Result "1/2-1/2"]` with
  a `1-0` termination marker).
- `onWarning` fires for duplicate tag names (same tag appearing more than once
  in the tag pair section). The `line` and `column` fields point to the opening
  `[` of the duplicate — exact source position, not a nominal placeholder.

### Changed

- Move number mismatch no longer emits to `console.warn` when `onWarning` is not
  provided. It is now silently ignored, consistent with how missing STR tag
  warnings are handled.

## [3.7.0] - 2026-03-15

### Added

- `onWarning` option for `parse()` and `stream()`: fires once per missing STR
  tag. Emitted in alphabetical key order: `Black`, `Date`, `Event`, `Result`,
  `Round`, `Site`, `White`.
- `ParseWarning` is now an exported type with the same shape as `ParseError`.

### Fixed

- `parse()` and `stream()` now strip a UTF-8 BOM (`\uFEFF`) at the start of
  input. Chessbase and Windows editors commonly produce BOM-prefixed PGN files
  that previously failed silently.
- Tag values containing escaped quotes (`\"`) or escaped backslashes (`\\`) now
  parse correctly per PGN spec section 7.
- Games with no tag pairs (bare move list + result) now parse correctly per PGN
  spec section 8.1 ("zero or more tag pairs"). These games return `meta: {}`.

## [3.6.2] - 2026-03-15

### Performance

- `pairMoves`: replaced `delete move.number; delete move.long` with an explicit
  clean output object constructed from only the known public `Move` fields.
  `delete` was fragmenting V8 hidden classes across move objects with different
  optional fields (e.g. promotion moves), causing megamorphic deoptimisation and
  GC pressure. `promotion.pgn` gap vs `pgn-parser` restored from 1.26x to 1.06x;
  `long.pgn` and `twic.pgn` also improved.

## [3.6.1] - 2026-03-15

### Fixed

- `stream()`: result tokens straddling a chunk boundary (e.g. `1` at end of
  chunk N, `-0` at start of chunk N+1) were silently missed, causing the two
  affected games to be merged and the second game to be lost. The boundary
  scanner now looks back up to 6 characters into already-scanned content on each
  chunk to catch split tokens.
- `stream()`: `onError` was incorrectly forwarded to the remainder-flush path,
  causing it to fire for truncated streams (input ending without a result token)
  — which is expected behaviour, not a parse error. The remainder-flush path now
  calls `parse()` without options.
- `toParseError`: `ParseError.offset` was always `0` — the field was being read
  from the top level of the Peggy error object, which does not exist. It is now
  correctly read from `location.start.offset`.

## [3.6.0] - 2026-03-15

### Added

- `onError` option for `parse()` and `stream()`: pass
  `onError: (err: ParseError) => void` to observe parse failures instead of
  silently receiving `[]`. `ParseError` carries `message`, `offset`, `line`, and
  `column` from the Peggy parser.
- `ParseError` and `ParseOptions` are now exported types.

### Changed

- `stream()` accepts an optional second argument `options?: ParseOptions`
  (backward-compatible).

### Performance

- Grammar `MOVE` action block: eliminated per-move object spread (`{ ...san }`)
  and replaced `filter`/`join` chains with explicit loops — reduces heap
  allocation on every move.
- `pairMoves`: pre-sized accumulator with `new Array(...)` and removed
  rest-spread destructuring — avoids per-move object creation and reduces V8
  array resizing.
- `stream()` boundary scanner: now O(n) per chunk — regex is only attempted at
  characters that can start a result token (`1`, `0`, `*`) rather than at every
  depth-0 character.

## [3.5.3] - 2026-03-14

### Fixed

- Castling moves with check or checkmate indicators (`O-O+`, `O-O#`, `O-O-O+`,
  `O-O-O#`) now correctly set `check: true` / `checkmate: true` on the returned
  Move object — previously the indicator was consumed and silently discarded
- Security: pin `vite>=6.4.1`, `rollup>=4.59.0`, `glob>=10.5.0` via pnpm
  overrides to resolve 8 Dependabot CVEs in devDependencies

### Changed

- Grammar: extract `applyIndicators` preamble helper to eliminate repeated
  `promo`/`ind` logic across all SAN action blocks

### Internal

- Add `vitest.config.ts` to exclude `grammar.cjs` and bench files from coverage
  reporting — coverage now reflects only authored source (`index.ts`)
- Add explicit SAN unit tests for all grammar alternatives and indicator
  combinations, covering patterns that snapshot tests cannot detect regressions
  in (full-square disambiguation, castling indicators, promotion+checkmate,
  etc.)

## [3.5.2] - 2026-03-14

### Fixed

- Benchmark: `benko.pgn` moved to multi-game group and compared with the correct
  `parseGames` API — previously called `parseGame` (single-game), causing all
  comparison parsers to error
- Benchmark: `comments.pgn` BOM (`U+FEFF`) now stripped before parsing, enabling
  comparison against `@mliebelt/pgn-parser` and `pgn-parser`
- Benchmark: fixture exclusion reasons documented in `BENCHMARK_RESULTS.md` and
  in bench source comments

## [3.5.1] - 2026-03-14

### Changed

- README: document `stream()` API with signature and Node.js usage example
- README: update type names (`Moves` → `MoveList`) and clarify `Move.from`
  disambiguation and move tuple slot semantics
- Updated benchmark results for v3.5.0 SAN rule restructure

## [3.5.0] - 2026-03-14

### Added

- `stream(input: AsyncIterable<string>): AsyncGenerator<PGN>` — new named export
  for incremental, memory-efficient parsing of large PGN databases

### Changed

- `Move.from` widened from `File | Rank` to `Disambiguation`
  (`Square | File | Rank`) to correctly type fully-disambiguated moves (e.g.
  `Qd1xe4` → `from: "d1"`)
- `type Moves` renamed to `MoveList`; new
  `MovePair = [number, Move | undefined, Move?]` tuple
- `type Variation` simplified to `MoveList[]`

### Performance

- Restructured `SAN` grammar rule to eliminate post-match regex on every move;
  closes remaining ~1.1–1.2x gap vs `pgn-parser` on move-heavy fixtures

## [3.4.0] - 2026-02-21

### Changed

- Rewrote README following `@echecs/elo` library style with badges, Why, Quick
  Start, Usage, and Contributing sections
- Updated AGENTS.md to reflect Peggy migration and remove stale nearley/moo
  references

### Added

- Features section in README highlighting RAV and NAG support with a parser
  comparison table
- Performance section in README with benchmark results table
- Codecov badge to README

### Removed

- `docs.yml` workflow (no hosted docs in this project)

## [3.3.0] - 2026-02-21

### Added

- Peggy PEG parser replacing nearley/moo for O(n) linear-time parsing —
  delivering up to 10× throughput improvement on large PGN files
- Comparative benchmark (`comparison.bench.ts`) measuring `@echecs/pgn` against
  `@mliebelt/pgn-parser` and `chess.js`

### Performance

- Replaced `pickBy` with direct property assignment in SAN action block,
  reducing allocations per move
- Added length-check guards before NAG and comment processing in MOVE action,
  skipping unnecessary work for moves without annotations
- Removed `delete` mutations and reduced allocations in `pairMoves`, avoiding V8
  hidden-class transitions

### Removed

- Stale `tokenizer.ts` debug script

## [3.2.1] - 2026-02-20

### Fixed

- Sort `multiGameFixtures` keys in comparison benchmark to satisfy the
  `sort-keys` lint rule

## [3.2.0] - 2026-02-20

### Added

- Comparative PGN parser benchmark (`comparison.bench.ts`) for cross-library
  performance tracking

### Performance

- Reduced Earley parser overhead via grammar and caching optimizations

## [3.1.3] - 2025-03-27

### Fixed

- Removed accidental production dependency introduced in 3.1.2

## [3.1.2] - 2025-03-01

### Fixed

- Increased per-test timeout to accommodate `long.pgn` (~3 500 games) on slow CI
  runners

## [3.1.1] - 2025-03-01

### Fixed

- Corrected `.js` extension on relative imports in test files (NodeNext
  resolution)

## [3.1.0] - 2025-03-01

### Added

- moo tokenizer for faster lexing
- New grammar supporting the full PGN specification including RAV (recursive
  annotated variations) and NAG (numeric annotation glyphs)

[unreleased]: https://github.com/echecsjs/pgn/compare/v5.0.0...HEAD
[5.0.0]: https://github.com/echecsjs/pgn/compare/v4.0.0...v5.0.0
[4.0.0]: https://github.com/echecsjs/pgn/compare/v3.12.2...v4.0.0
[3.12.2]: https://github.com/echecsjs/pgn/compare/v3.12.1...v3.12.2
[3.12.1]: https://github.com/mormubis/pgn/compare/v3.12.0...v3.12.1
[3.12.0]: https://github.com/mormubis/pgn/compare/v3.11.0...v3.12.0
[3.11.0]: https://github.com/mormubis/pgn/compare/v3.10.1...v3.11.0
[3.10.1]: https://github.com/mormubis/pgn/compare/v3.10.0...v3.10.1
[3.10.0]: https://github.com/mormubis/pgn/compare/v3.9.1...v3.10.0
[3.9.1]: https://github.com/mormubis/pgn/compare/v3.9.0...v3.9.1
[3.9.0]: https://github.com/mormubis/pgn/compare/v3.8.3...v3.9.0
[3.8.3]: https://github.com/mormubis/pgn/compare/v3.8.2...v3.8.3
[3.8.2]: https://github.com/mormubis/pgn/compare/v3.8.1...v3.8.2
[3.8.1]: https://github.com/mormubis/pgn/compare/v3.8.0...v3.8.1
[3.8.0]: https://github.com/mormubis/pgn/compare/v3.7.0...v3.8.0
[3.7.0]: https://github.com/mormubis/pgn/compare/v3.6.2...v3.7.0
[3.6.2]: https://github.com/mormubis/pgn/compare/v3.6.1...v3.6.2
[3.6.1]: https://github.com/mormubis/pgn/compare/v3.6.0...v3.6.1
[3.6.0]: https://github.com/mormubis/pgn/compare/v3.5.3...v3.6.0
[3.5.3]: https://github.com/mormubis/pgn/compare/v3.5.2...v3.5.3
[3.5.2]: https://github.com/mormubis/pgn/compare/v3.5.1...v3.5.2
[3.5.1]: https://github.com/mormubis/pgn/compare/v3.5.0...v3.5.1
[3.5.0]: https://github.com/mormubis/pgn/compare/v3.4.0...v3.5.0
[3.4.0]: https://github.com/mormubis/pgn/compare/v3.3.0...v3.4.0
[3.3.0]: https://github.com/mormubis/pgn/compare/v3.2.1...v3.3.0
[3.2.1]: https://github.com/mormubis/pgn/compare/v3.2.0...v3.2.1
[3.2.0]: https://github.com/mormubis/pgn/compare/v3.1.3...v3.2.0
[3.1.3]: https://github.com/mormubis/pgn/compare/v3.1.2...v3.1.3
[3.1.2]: https://github.com/mormubis/pgn/compare/v3.1.1...v3.1.2
[3.1.1]: https://github.com/mormubis/pgn/compare/v3.1.0...v3.1.1
[3.1.0]: https://github.com/mormubis/pgn/releases/tag/v3.1.0
