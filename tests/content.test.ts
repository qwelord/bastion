import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { demoPosition, moves, exercisePosition, courses } from '../src/data/demo.ts';

test('every demo position matches a legal chess sequence, including both castlings', () => {
  const chess = new Chess();
  for (let ply = 0; ply <= moves.length; ply++) {
    const actual = Object.fromEntries(
      chess
        .board()
        .flat()
        .filter(Boolean)
        .map((p) => [p!.square, p!.color + p!.type]),
    );
    assert.deepEqual(demoPosition(ply), actual, `position after ply ${ply}`);
    if (ply < moves.length) {
      const [from, to, san] = moves[ply];
      assert.equal(chess.move({ from, to }).san, san);
    }
  }
});

test('the lesson is a legal mate in one, and the two distractors are not mates', () => {
  const fen = '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1';
  const chess = new Chess(fen);
  const actual = Object.fromEntries(
    chess
      .board()
      .flat()
      .filter(Boolean)
      .map((p) => [p!.square, p!.color + p!.type]),
  );
  assert.deepEqual(exercisePosition, actual);
  chess.move('Re8#');
  assert.equal(chess.isCheckmate(), true);
  for (const move of ['Re7', 'Kf1']) {
    chess.load(fen);
    chess.move(move);
    assert.equal(chess.isCheckmate(), false);
  }
});

test('curriculum plan has unique identifiers and totals 1080 planned lessons', () => {
  assert.equal(new Set(courses.map((c) => c.id)).size, courses.length);
  assert.equal(
    courses.reduce((sum, c) => sum + c.lessons, 0),
    1080,
  );
});
