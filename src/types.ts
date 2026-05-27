import type { SAN, Square } from '@echecs/san';

type AnnotationColor = 'B' | 'C' | 'G' | 'O' | 'R' | 'Y';
type Result = '1-0' | '0-1' | '1/2-1/2' | '?';

interface Arrow {
  color: AnnotationColor;
  from: Square;
  to: Square;
}

interface SquareAnnotation {
  color: AnnotationColor;
  square: Square;
}

type Eval =
  | { depth?: number; type: 'cp'; value: number }
  | { depth?: number; type: 'mate'; value: number };

interface Meta {
  Result?: Result;
  [key: string]: string | undefined;
}

interface Notation extends SAN {
  annotations?: string[];
  arrows?: Arrow[];
  clock?: number;
  comment?: string;
  eval?: Eval;
  squares?: SquareAnnotation[];
  variants?: Variation;
}

type NotationPair = [number, Notation | undefined, Notation?];
type NotationList = NotationPair[];

interface PGN {
  meta: Meta;
  moves: NotationList;
  result: 1 | 0 | 0.5 | '?';
}

type Variation = NotationList[];

interface ParseError {
  column: number;
  line: number;
  message: string;
  offset: number;
}

interface StringifyOptions {
  onWarning?: (warning: ParseWarning) => void;
}

interface ParseOptions extends StringifyOptions {
  onError?: (error: ParseError) => void;
}

interface ParseWarning {
  column: number;
  line: number;
  message: string;
  offset: number;
}

export type {
  AnnotationColor,
  Arrow,
  Eval,
  Meta,
  Notation,
  NotationList,
  NotationPair,
  ParseError,
  ParseOptions,
  ParseWarning,
  PGN,
  Result,
  SquareAnnotation,
  StringifyOptions,
  Variation,
};

export {
  type Disambiguation,
  type File,
  type PieceType,
  type PromotionPieceType,
  type Rank,
  type SAN,
  type Square,
} from '@echecs/san';
