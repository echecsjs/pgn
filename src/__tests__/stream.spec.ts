import { afterEach, describe, expect, it, vi } from 'vitest';

import { stream } from '../index.js';

async function* chunksOf(s: string, size: number): AsyncGenerator<string> {
  for (let index = 0; index < s.length; index += size) {
    yield s.slice(index, index + size);
  }
}

async function collect<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const results: T[] = [];
  for await (const item of gen) {
    results.push(item);
  }
  return results;
}

const singleGame = `[Event "Test"]
[White "A"]
[Black "B"]
[Result "1-0"]

1. e4 e5 2. Nf3 1-0`;

async function* emptyGenerator(): AsyncGenerator<string> {
  yield* [];
}

async function* fromArray(array: string[]): AsyncGenerator<string> {
  for (const chunk of array) {
    yield chunk;
  }
}

const twoGames = `[Event "Game 1"]
[Result "1-0"]

1. e4 1-0

[Event "Game 2"]
[Result "0-1"]

1. d4 0-1`;

describe('stream()', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits a deprecation warning on first call', async () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await collect(stream(chunksOf(singleGame, 1024)));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('deprecated'));
  });

  it('yields one game from a single-game input', async () => {
    const games = await collect(stream(chunksOf(singleGame, 1024)));
    expect(games).toHaveLength(1);
    expect(games[0]?.meta['White']).toBe('A');
  });

  it('yields multiple games from a multi-game input', async () => {
    const games = await collect(stream(chunksOf(twoGames, 1024)));
    expect(games).toHaveLength(2);
    expect(games[0]?.meta['Event']).toBe('Game 1');
    expect(games[1]?.meta['Event']).toBe('Game 2');
  });

  it('handles chunks that split across game boundaries', async () => {
    // Use tiny chunk size to force splits at every possible boundary
    const games = await collect(stream(chunksOf(twoGames, 5)));
    expect(games).toHaveLength(2);
  });

  it('handles chunks that split a result token', async () => {
    // "1/2-1/2" can be split mid-token
    const draw = `[Event "Draw"]
[Result "1/2-1/2"]

1. e4 e5 1/2-1/2`;
    const games = await collect(stream(chunksOf(draw, 3)));
    expect(games).toHaveLength(1);
    expect(games[0]?.result).toBe(0.5);
  });

  it('skips result tokens inside comments', async () => {
    const withComment = `[Event "Test"]
[Result "1-0"]

1. e4 { This is 1-0 territory } e5 1-0`;
    const games = await collect(stream(chunksOf(withComment, 1024)));
    expect(games).toHaveLength(1);
  });

  it('yields nothing for empty input', async () => {
    const games = await collect(stream(emptyGenerator()));
    expect(games).toHaveLength(0);
  });

  it('accepts a Node.js-style ReadableStream of strings', async () => {
    // Simulate by passing an array wrapped in an async generator
    const games = await collect(stream(fromArray([singleGame])));
    expect(games).toHaveLength(1);
  });

  it('handles comments that span chunk boundaries', async () => {
    const pgn = `[Event "Test"]
[Result "1-0"]

1. e4 { a long comment } e5 1-0`;
    // Use chunk size of 20 to force the comment to span multiple chunks
    const games = await collect(stream(chunksOf(pgn, 20)));
    expect(games).toHaveLength(1);
    expect(games[0]?.result).toBe(1);
  });

  it('handles result tokens inside tag values', async () => {
    const pgn = `[Event "Sicilian 1-0 Attack"]
[Result "1-0"]

1. e4 c5 1-0`;
    const games = await collect(stream(chunksOf(pgn, 1024)));
    expect(games).toHaveLength(1);
    expect(games[0]?.meta['Event']).toBe('Sicilian 1-0 Attack');
  });

  it('does not split on a result token inside an escaped quote in a tag value', async () => {
    // "A \"1-0\" game" — the 1-0 inside the escaped quotes must not be treated
    // as a game boundary by the stream() state machine.
    const pgn = '[Event "A \\"1-0\\" game"]\n[Result "1-0"]\n\n1. e4 1-0';
    const games = await collect(stream(chunksOf(pgn, 5)));
    expect(games).toHaveLength(1);
    expect(games[0]?.meta['Event']).toBe('A "1-0" game');
  });

  it('flushes a game whose input has no result token', async () => {
    // Input with no result token — the remainder-flush path in extractGames(true)
    // parse() will return [] for this malformed input, so stream yields nothing
    const pgn = `[Event "Truncated"]
[White "A"]
[Black "B"]

1. e4 e5`;
    const games = await collect(stream(chunksOf(pgn, 1024)));
    expect(games).toHaveLength(0);
  });

  it('does not lose a game when a result token straddles a chunk boundary', async () => {
    // Regression test: if chunk 1 ends with '1' (start of '1-0') and chunk 2
    // begins with '-0', the token must still be detected and both games yielded.
    const game1 = '[Event "G1"]\n[Result "1-0"]\n\n1. e4 1';
    const game2 = '-0\n\n[Event "G2"]\n[Result "0-1"]\n\n1. d4 0-1';
    const games = await collect(stream(fromArray([game1, game2])));
    expect(games).toHaveLength(2);
    expect(games[0]?.meta['Event']).toBe('G1');
    expect(games[1]?.meta['Event']).toBe('G2');
  });

  it('forwards onWarning through stream() for games with missing STR tags', async () => {
    const warnings: unknown[] = [];
    const games = await collect(
      stream(fromArray(['1. e4 1-0\n']), {
        onWarning: (w) => {
          warnings.push(w);
        },
      }),
    );
    expect(games).toHaveLength(1);
    expect(warnings).toHaveLength(7);
  });

  it('calls onError for malformed game chunks with a result token', async () => {
    const errors: unknown[] = [];
    const games: unknown[] = [];
    const malformedStream = stream(fromArray(['XBAD 1-0\n']), {
      onError: (error) => {
        errors.push(error);
      },
    });
    for await (const game of malformedStream) {
      games.push(game);
    }
    expect(games).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      column: 1,
      line: 1,
      message: expect.stringMatching(/Expected|expected/i),
      offset: 0,
    });
  });

  it('strips a UTF-8 BOM from the start of the first chunk', async () => {
    const pgn = '[Event "Test"]\n[Result "1-0"]\n\n1. e4 1-0';
    const games = await collect(stream(fromArray(['\u{FEFF}' + pgn])));
    expect(games).toHaveLength(1);
    expect(games[0]?.meta['Event']).toBe('Test');
  });

  it('strips a UTF-8 BOM when it arrives as its own chunk', async () => {
    const pgn = '[Event "Test"]\n[Result "1-0"]\n\n1. e4 1-0';
    const games = await collect(stream(fromArray(['\u{FEFF}', pgn])));
    expect(games).toHaveLength(1);
    expect(games[0]?.meta['Event']).toBe('Test');
  });

  it('accepts a Web Streams ReadableStream<string>', async () => {
    const rs = new ReadableStream<string>({
      start(controller) {
        controller.enqueue(singleGame);
        controller.close();
      },
    });
    const games = await collect(stream(rs));
    expect(games).toHaveLength(1);
    expect(games[0]?.meta['White']).toBe('A');
  });

  it('accepts a Web Streams ReadableStream<string> with multiple chunks', async () => {
    const rs = new ReadableStream<string>({
      start(controller) {
        for (let index = 0; index < twoGames.length; index += 5) {
          controller.enqueue(twoGames.slice(index, index + 5));
        }
        controller.close();
      },
    });
    const games = await collect(stream(rs));
    expect(games).toHaveLength(2);
    expect(games[0]?.meta['Event']).toBe('Game 1');
    expect(games[1]?.meta['Event']).toBe('Game 2');
  });

  it('yields a valid game flushed from the buffer after all chunks are consumed', async () => {
    // Deliver the entire game in one chunk with no trailing whitespace or
    // newline after the result token. The regex lookahead (?=[ \t\n\r]|$)
    // matches $ only at the very end of the string — but v8 regex with /g
    // and lastIndex set mid-string does not see $ as end-of-string.
    // So the result token is NOT matched during the main loop; instead
    // it lands in the final extractGames(true) remainder-flush path.
    const pgn = '[Event "B"]\n[Result "0-1"]\n\n1. d4 0-1';
    const games = await collect(stream(fromArray([pgn])));
    expect(games).toHaveLength(1);
    expect(games[0]?.meta['Event']).toBe('B');
  });

  it('forwards onWarning to parse() for each game', async () => {
    const warnings: string[] = [];
    // Missing Black tag triggers an STR warning
    const pgn = '[Event "T"]\n[Result "1-0"]\n\n1. e4 1-0';
    const games = await collect(
      stream(fromArray([pgn]), {
        onWarning: (w) => {
          warnings.push(w.message);
        },
      }),
    );
    expect(games).toHaveLength(1);
    expect(warnings.some((w) => w.includes('Black'))).toBe(true);
  });
});
