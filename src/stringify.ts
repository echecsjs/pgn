import { RESULT_TO_STR } from './constants.js';
import { stringifySAN } from './san.js';
import { stringifyTags } from './tags.js';

import type {
  Eval,
  Notation,
  NotationList,
  PGN,
  StringifyOptions,
} from './types.js';

// ─── Comment commands ─────────────────────────────────────────────────────────

function secondsToClk(seconds: number): string {
  const totalMs = Math.round(seconds * 1000);
  const h = Math.floor(totalMs / 3_600_000);
  const m = Math.floor((totalMs % 3_600_000) / 60_000);
  const sMs = totalMs % 60_000;
  const sWhole = Math.floor(sMs / 1000);
  const sFrac = sMs % 1000;

  const sString =
    sFrac === 0
      ? String(sWhole).padStart(2, '0')
      : `${String(sWhole).padStart(2, '0')}.${String(sFrac).replace(/0+$/, '')}`;

  return `${String(h)}:${String(m).padStart(2, '0')}:${sString}`;
}

function stringifyEval(evaluation: Eval): string {
  const depth =
    'depth' in evaluation && evaluation.depth !== undefined
      ? `,${evaluation.depth}`
      : '';
  if (evaluation.type === 'mate') {
    return `[%eval #${evaluation.value}${depth}]`;
  }
  return `[%eval ${evaluation.value.toFixed(2)}${depth}]`;
}

function stringifyComment(move: Notation, options?: StringifyOptions): string {
  const parts: string[] = [];

  if (move.arrows && move.arrows.length > 0) {
    const tokens = move.arrows.map((a) => `${a.color}${a.from}${a.to}`);
    parts.push(`[%cal ${tokens.join(',')}]`);
  }

  if (move.squares && move.squares.length > 0) {
    const tokens = move.squares.map((s) => `${s.color}${s.square}`);
    parts.push(`[%csl ${tokens.join(',')}]`);
  }

  if (move.clock !== undefined) {
    let clock = move.clock;
    if (clock < 0) {
      options?.onWarning?.({
        column: 1,
        line: 1,
        message: `Negative clock value: ${clock}`,
        offset: 0,
      });
      clock = 0;
    }
    parts.push(`[%clk ${secondsToClk(clock)}]`);
  }

  if (move.eval !== undefined) {
    parts.push(stringifyEval(move.eval));
  }

  if (move.comment !== undefined) {
    parts.push(move.comment);
  }

  if (parts.length === 0) {
    return '';
  }

  return `{ ${parts.join(' ')} }`;
}

// ─── Move list ────────────────────────────────────────────────────────────────

function hasAnnotation(move: Notation): boolean {
  return (
    (move.annotations !== undefined && move.annotations.length > 0) ||
    move.comment !== undefined ||
    move.arrows !== undefined ||
    move.squares !== undefined ||
    move.clock !== undefined ||
    move.eval !== undefined ||
    (move.variants !== undefined && move.variants.length > 0)
  );
}

function stringifyMoveList(
  moves: NotationList,
  options?: StringifyOptions,
): string {
  const tokens: string[] = [];

  for (const pair of moves) {
    const [moveNumber, white, black] = pair;

    if (white !== undefined) {
      tokens.push(`${moveNumber}.`, stringifySAN(white));

      if (white.annotations && white.annotations.length > 0) {
        tokens.push(
          white.annotations
            .map((a) => (/^\d+$/.test(a) ? `$${a}` : a))
            .join(' '),
        );
      }

      const whiteComment = stringifyComment(white, options);
      if (whiteComment) {
        tokens.push(whiteComment);
      }

      if (white.variants && white.variants.length > 0) {
        for (const variation of white.variants) {
          tokens.push(`(${stringifyMoveList(variation, options)})`);
        }
      }
    }

    if (black !== undefined) {
      const isNeedsMoveNumber = white === undefined || hasAnnotation(white);

      if (isNeedsMoveNumber) {
        tokens.push(`${moveNumber}...`);
      }

      tokens.push(stringifySAN(black));

      if (black.annotations && black.annotations.length > 0) {
        tokens.push(
          black.annotations
            .map((a) => (/^\d+$/.test(a) ? `$${a}` : a))
            .join(' '),
        );
      }

      const blackComment = stringifyComment(black, options);
      if (blackComment) {
        tokens.push(blackComment);
      }

      if (black.variants && black.variants.length > 0) {
        for (const variation of black.variants) {
          tokens.push(`(${stringifyMoveList(variation, options)})`);
        }
      }
    }
  }

  return tokens.join(' ');
}

// ─── Public API ───────────────────────────────────────────────────────────────

function stringifyOne(game: PGN, options?: StringifyOptions): string {
  const tags = stringifyTags(game.meta);
  const movetext = stringifyMoveList(game.moves, options);
  const result = RESULT_TO_STR[String(game.result)] ?? '*';
  const header = tags.length > 0 ? tags + '\n\n' : '';
  const separator = movetext.length > 0 ? ' ' : '';
  return `${header}${movetext}${separator}${result}\n`;
}

function stringify(input: PGN | PGN[], options?: StringifyOptions): string {
  if (Array.isArray(input)) {
    return input.map((game) => stringifyOne(game, options)).join('\n');
  }
  return stringifyOne(input, options);
}

export { stringify };
