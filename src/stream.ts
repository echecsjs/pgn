import { parse } from './parse.js';

import type { PGN, ParseOptions } from './types.js';

// Minimal structural type for the Web Streams ReadableStream<string>.
// Avoids pulling in the full DOM lib while still accepting any conforming
// ReadableStream implementation (browser, Node.js 18+, edge runtimes).
interface StringReadableStream {
  getReader(): {
    read(): Promise<{ done: boolean; value: string | undefined }>;
    releaseLock(): void;
  };
}

async function* readableStreamToIterable(
  rs: StringReadableStream,
): AsyncGenerator<string> {
  const reader = rs.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value !== undefined) {
        yield value;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

let _warned = false;

/**
 * Stream-parse a PGN AsyncIterable or Web Streams ReadableStream, yielding
 * one PGN object per game. Memory usage stays proportional to one game at a time.
 *
 * @deprecated Use `parse()` instead, which already handles multi-game input.
 *   `stream()` will be removed in the next major version.
 *
 * @param input - Any AsyncIterable<string> or ReadableStream<string>
 *   (Node.js readable stream, fetch body piped through TextDecoderStream, etc.)
 * @param options - Optional. Pass `onError` to observe parse failures instead of
 *   silently skipping malformed games. Not called for truncated streams (input
 *   ending without a result token). Pass `onWarning` to observe spec-compliance
 *   issues (missing STR tags, move number mismatches, etc.).
 */
export async function* stream(
  input: AsyncIterable<string> | StringReadableStream,
  options?: ParseOptions,
): AsyncGenerator<PGN> {
  if (!_warned) {
    _warned = true;
    // eslint-disable-next-line no-console
    console.warn(
      '@echecs/pgn: stream() is deprecated. Use parse() instead. stream() will be removed in the next major version.',
    );
  }

  if ('getReader' in input) {
    yield* stream(readableStreamToIterable(input), options);
    return;
  }
  let buffer = '';
  let depth = 0; // brace depth — tracks {…} comment nesting
  let inString = false; // whether we're inside a "…" tag value string
  let scanOffset = 0; // first index in buffer not yet scanned for state changes

  function* extractGames(final: boolean): Generator<string> {
    // Combined state-update and token-detection pass.
    //
    // State updates (depth/inString) only run for newly-seen characters
    // (index >= scanOffset). Token detection also covers a lookback window of
    // MAX_TOKEN_LEN-1 = 6 positions before scanOffset so that result tokens
    // that straddle a chunk boundary (e.g. '1' at end of chunk N, '-0' at
    // start of chunk N+1) are not missed. The depth/inString state at those
    // positions is already correct from the previous call.
    //
    // Result tokens (1-0, 0-1, 1/2-1/2, *) are only attempted at characters
    // '1', '0', '*' when depth === 0 and !inString — O(n) regex work.
    const MAX_TOKEN_LEN = 7; // len("1/2-1/2")
    const re = /(?:1-0|0-1|1\/2-1\/2|\*)(?=[ \t\n\r]|$)/g;
    let lastIndex = 0;
    const tokenStart = Math.max(0, scanOffset - (MAX_TOKEN_LEN - 1));

    for (let index = tokenStart; index < buffer.length; index++) {
      const ch = buffer[index];

      // State updates only for newly-seen characters
      if (index >= scanOffset) {
        if (inString) {
          if (ch === '\\') {
            // Skip the next character — it is escaped (handles \" and \\).
            index++;
          } else if (ch === '"') {
            inString = false;
          }
          continue;
        }
        if (ch === '{') {
          depth++;
          continue;
        }
        if (ch === '}') {
          depth = Math.max(0, depth - 1);
          continue;
        }
        // Quotes inside braces are not string delimiters (PGN tag values only
        // appear at depth 0).
        if (ch === '"' && depth === 0) {
          inString = true;
          continue;
        }
      }

      // Token detection at depth 0, only at characters that can start a
      // result token ('1', '0', '*'). Regex is called at most once per candidate.
      if (
        !inString &&
        depth === 0 &&
        (ch === '1' || ch === '0' || ch === '*')
      ) {
        re.lastIndex = index;
        const m = re.exec(buffer);
        if (m && m.index === index) {
          const end = index + m[0].length;
          yield buffer.slice(lastIndex, end);
          lastIndex = end;
          index = end - 1; // outer loop will increment past the consumed token
        }
      }
    }

    scanOffset = buffer.length;

    if (final && lastIndex < buffer.length) {
      const remainder = buffer.slice(lastIndex).trim();
      if (remainder.length > 0) {
        yield remainder;
      }
      buffer = '';
      scanOffset = 0;
    } else {
      // Trim consumed games from the buffer. depth/inString already account for
      // the full old buffer, so scanOffset = new buffer.length marks it as
      // fully state-scanned.
      buffer = buffer.slice(lastIndex);
      scanOffset = buffer.length;
    }
  }

  for await (const chunk of input) {
    // Strip BOM when the buffer is empty (i.e. before any content has been
    // accumulated). This covers both the first chunk and the degenerate case
    // where the BOM arrives as its own chunk followed by the rest of the input.
    if (buffer.length === 0) {
      buffer = chunk.replace(/^\uFEFF/, '');
    } else {
      buffer += chunk;
    }
    for (const gameString of extractGames(false)) {
      const games = parse(gameString, options);
      if (games.length > 0) {
        yield games[0] as PGN;
      }
    }
  }

  // Any remainder in the buffer after all chunks are consumed has no result
  // token — the grammar requires one, so parse() will always return [] for it,
  // meaning onError is never reached for truncated input. options is passed in
  // full so that onWarning still fires for any valid games that happen to land
  // in the remainder (e.g. result token at the exact end of the last chunk).
  for (const gameString of extractGames(true)) {
    const games = parse(gameString, options);
    for (const game of games) {
      yield game;
    }
  }
}
