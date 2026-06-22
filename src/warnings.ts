import { RESULT_TO_STR, STR_TAGS } from './constants.js';

import type { PGN, ParseOptions } from './types.js';

// Fires onWarning for each STR key absent from a game's meta. Warnings are
// emitted in alphabetical key order (the order of STR_TAGS above). Position
// fields are nominal placeholders — a missing tag has no source location.
function warnMissingSTR(games: PGN[], options: ParseOptions | undefined): void {
  if (!options?.onWarning) {
    return;
  }
  for (const game of games) {
    for (const key of STR_TAGS) {
      if (!Object.hasOwn(game.meta, key)) {
        options.onWarning({
          column: 1,
          line: 1,
          message: `Missing STR tag: ${key}`,
          offset: 0,
        });
      }
    }
  }
}

function warnResultMismatch(
  games: PGN[],
  options: ParseOptions | undefined,
): void {
  if (!options?.onWarning) {
    return;
  }
  for (const game of games) {
    const tagResult = game.meta['Result'];
    const tokenResult = RESULT_TO_STR[String(game.result)];
    if (tagResult !== undefined && tagResult !== tokenResult) {
      options.onWarning({
        column: 1,
        line: 1,
        message: `Result tag "${tagResult}" does not match game termination marker "${tokenResult ?? String(game.result)}"`,
        offset: 0,
      });
    }
  }
}

export { warnMissingSTR, warnResultMismatch };
