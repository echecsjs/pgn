import { processComments } from './comments.js';
import parser from './grammar.cjs';
import { warnMissingSTR, warnResultMismatch } from './warnings.js';

import type { PGN, ParseError, ParseOptions } from './types.js';

function toParseError(thrown: unknown): ParseError {
  if (thrown !== null && typeof thrown === 'object' && 'message' in thrown) {
    const error = thrown as Record<string, unknown>;
    const location = error['location'] as Record<string, unknown> | undefined;
    const start = location?.['start'] as Record<string, unknown> | undefined;
    return {
      column: typeof start?.['column'] === 'number' ? start['column'] : 1,
      line: typeof start?.['line'] === 'number' ? start['line'] : 1,
      message: String(error['message']),
      offset: typeof start?.['offset'] === 'number' ? start['offset'] : 0,
    };
  }
  return { column: 1, line: 1, message: String(thrown), offset: 0 };
}

/**
 * Parse a PGN string into an array of games
 *
 * @param input
 */
function parse(input: string, options?: ParseOptions): PGN[] {
  const cleaned = input.replace(/^\uFEFF/, '').trim();

  try {
    const games = parser.parse(cleaned, {
      onWarning: options?.onWarning,
    }) as PGN[];
    processComments(games);
    warnMissingSTR(games, options);
    warnResultMismatch(games, options);
    return games;
  } catch (error) {
    options?.onError?.(toParseError(error));
    return [];
  }
}

export { parse };
