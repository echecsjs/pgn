import type {
  AnnotationColor,
  Arrow,
  Eval,
  Notation,
  NotationList,
  PGN,
  Square,
  SquareAnnotation,
} from './types.js';

const CAL_CSL_RE = /\[%(?:cal|csl)\s*([^[\]]*)\]/gi;

const CLK_RE = /\[%clk\s+(\d+):(\d{2}):(\d{2}(?:\.\d+)?)\]/i;

const EVAL_RE =
  /\[%eval\s+(?:#([+-]?\d+)|([+-]?(?:\d+\.?\d*|\.\d+)))(?:,(\d+))?\]/i;

interface CommentFields {
  arrows?: Arrow[];
  clock?: number;
  comment?: string;
  eval?: Eval;
  squares?: SquareAnnotation[];
}

function removeMatch(text: string, match: RegExpExecArray): string {
  return text.slice(0, match.index) + text.slice(match.index + match[0].length);
}

function parseCommentCommands(raw: string): CommentFields {
  if (!raw.includes('[%')) {
    return { comment: raw };
  }

  const result: CommentFields = {};
  let text = raw;

  // [%cal] and [%csl]
  const arrows: Arrow[] = [];
  const squares: SquareAnnotation[] = [];
  text = text.replaceAll(CAL_CSL_RE, (_match, tokens: string) => {
    for (const rawToken of tokens.split(',')) {
      const token = rawToken.trim();
      const color = (token.at(0)?.toUpperCase() ?? '') as AnnotationColor;
      if (!color || !/^[BCGORY]$/.test(color)) {
        continue;
      }
      const rest = token.slice(1);
      if (rest.length === 2) {
        squares.push({ color, square: rest as Square });
      } else if (rest.length === 4) {
        arrows.push({
          color,
          from: rest.slice(0, 2) as Square,
          to: rest.slice(2) as Square,
        });
      }
      // malformed token — skip silently
    }
    return '';
  });
  if (arrows.length > 0) {
    result.arrows = arrows;
  }
  if (squares.length > 0) {
    result.squares = squares;
  }

  // [%clk]
  const clkMatch = CLK_RE.exec(text);
  if (clkMatch) {
    const hString = clkMatch[1] ?? '0';
    const mString = clkMatch[2] ?? '0';
    const sString = clkMatch[3] ?? '0';
    const h = Number(hString);
    const m = Number(mString);
    const s = Number(sString);
    result.clock = h * 3600 + m * 60 + s;
    text = removeMatch(text, clkMatch);
  }

  // [%eval]
  const evalMatch = EVAL_RE.exec(text);
  if (evalMatch) {
    const depth = evalMatch[3] === undefined ? undefined : Number(evalMatch[3]);
    if (evalMatch[1] !== undefined) {
      result.eval = {
        ...(depth !== undefined && { depth }),
        type: 'mate',
        value: Number(evalMatch[1]),
      };
    } else if (evalMatch[2] !== undefined) {
      result.eval = {
        ...(depth !== undefined && { depth }),
        type: 'cp',
        value: Number(evalMatch[2]),
      };
    }
    text = removeMatch(text, evalMatch);
  }

  // Clean up remaining text
  const trimmed = text.replaceAll(/\s+/g, ' ').trim();
  if (trimmed.length > 0) {
    result.comment = trimmed;
  }

  return result;
}

function applyCommentFields(move: Notation, fields: CommentFields): Notation {
  return {
    ...(move.annotations !== undefined && { annotations: move.annotations }),
    ...(fields.arrows !== undefined && { arrows: fields.arrows }),
    capture: move.capture,
    castling: move.castling,
    check: move.check,
    checkmate: move.checkmate,
    ...(fields.clock !== undefined && { clock: fields.clock }),
    ...(fields.eval !== undefined && { eval: fields.eval }),
    ...(fields.comment !== undefined && { comment: fields.comment }),
    from: move.from,
    long: move.long,
    piece: move.piece,
    promotion: move.promotion,
    ...(fields.squares !== undefined && { squares: fields.squares }),
    to: move.to,
    ...(move.variants !== undefined && { variants: move.variants }),
  };
}

function processHalfMove(pair: NotationList[number], index: number): void {
  const move = pair[index] as Notation | undefined;
  if (move === undefined) {
    return;
  }

  if (move.comment !== undefined) {
    const fields = parseCommentCommands(move.comment);
    pair[index] = applyCommentFields(move, fields);
  }
  if (move.variants !== undefined) {
    for (const variation of move.variants) {
      processMoveList(variation);
    }
  }
}

function processMoveList(moves: NotationList): void {
  for (const pair of moves) {
    for (let index = 1; index <= 2; index++) {
      processHalfMove(pair, index);
    }
  }
}

function processComments(games: PGN[]): void {
  for (const game of games) {
    processMoveList(game.moves);
  }
}

export { processComments };
