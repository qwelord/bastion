export type Position = Record<string, string>;
export const initialPosition: Position = Object.fromEntries(
  Array.from({ length: 8 }, (_, i) => [
    [`${'abcdefgh'[i]}1`, 'w' + 'rnbqkbnr'[i]],
    [`${'abcdefgh'[i]}2`, 'wp'],
    [`${'abcdefgh'[i]}7`, 'bp'],
    [`${'abcdefgh'[i]}8`, 'b' + 'rnbqkbnr'[i]],
  ]).flat(),
);
