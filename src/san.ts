import type { Notation } from './types.js';

const PIECE_TO_LETTER: Record<string, string> = {
  bishop: 'B',
  king: 'K',
  knight: 'N',
  pawn: '',
  queen: 'Q',
  rook: 'R',
};

const PROMOTION_TO_LETTER: Record<string, string> = {
  bishop: 'B',
  knight: 'N',
  queen: 'Q',
  rook: 'R',
};

function applyIndicators(san: string, move: Notation): string {
  if (move.checkmate) {
    return san + '#';
  }
  return move.check ? san + '+' : san;
}

function stringifySAN(move: Notation): string {
  if (move.castling) {
    return applyIndicators(move.long ? 'O-O-O' : 'O-O', move);
  }

  let san = '';

  if (move.piece === 'pawn') {
    san += move.capture ? (move.from ?? '') + 'x' + move.to : move.to;
    if (move.promotion !== undefined) {
      san += '=' + PROMOTION_TO_LETTER[move.promotion];
    }
  } else {
    san += PIECE_TO_LETTER[move.piece];
    if (move.from !== undefined) {
      san += move.from;
    }
    if (move.capture) {
      san += 'x';
    }
    san += move.to;
  }

  return applyIndicators(san, move);
}

export { stringifySAN };
