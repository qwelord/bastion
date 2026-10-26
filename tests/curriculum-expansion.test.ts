import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { lessons, findLesson, lessonDifficulty } from '../src/learning/catalog.ts';
import { courses, courseStats } from '../src/learning/courses.ts';
import { StepSession } from '../src/learning/session.ts';
import { applyStepRecord, readLearning, updateLearning } from '../src/learning/progress.ts';
import { validateLesson } from '../src/learning/schema.ts';

function memoryStorage() {
  let value: string | null = null;
  return {
    getItem: (key: string) => (key === 'bastion.learning.v1' ? value : null),
    setItem: (_key: string, raw: string) => {
      value = raw;
    },
  };
}
function complete(step: (typeof lessons)[number]['steps'][number]) {
  const session = new StepSession(step);
  if (step.kind === 'explain') session.read();
  if (step.kind === 'choice') session.choose(step.answer);
  if (step.kind === 'squares') {
    step.targets.forEach((square) => session.toggleSquare(square));
    session.checkSquares();
  }
  if (step.kind === 'move')
    for (let i = 0; i < step.lines[0].length; i += 2) session.move(step.lines[0][i]);
  assert.equal(session.state.complete, true);
  return session.snapshot();
}
test('v0.5 solved steps notes and favorites survive an added debrief without reset', () => {
  const lesson = findLesson('board-map-1')!;
  const old = { ...lesson, steps: lesson.steps.filter((step) => step.id !== 'debrief') };
  const storage = memoryStorage();
  const progress = readLearning([old], storage);
  old.steps.forEach((step, cursor) => applyStepRecord(progress, old, cursor, complete(step)));
  progress.entries[old.id].note = 'Координаты не меняются при перевороте.';
  progress.entries[old.id].favorite = true;
  storage.setItem('bastion.learning.v1', JSON.stringify(progress));
  const restored = readLearning(lessons, storage).entries[old.id];
  assert.equal(restored.steps.practice.completed, true);
  assert.equal(restored.steps.practice.mastered, true);
  assert.equal(restored.steps.debrief, undefined);
  assert.equal(restored.favorite, true);
  assert.equal(restored.note, progress.entries[old.id].note);
});
test('the published two-move smothered mates include every legal defensive reply', () => {
  for (const id of ['forcing-sacrifices-3', 'forcing-sacrifices-5', 'mixed-tactics-4']) {
    const step = findLesson(id)!.steps.find((step) => step.kind === 'move')!;
    assert.equal(step.kind, 'move');
    if (step.kind !== 'move') continue;
    const game = new Chess(step.fen);
    const play = (uci: string) =>
      game.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        ...(uci[4] ? { promotion: uci[4] } : {}),
      });
    play(step.lines[0][0]);
    const replies = game
      .moves({ verbose: true })
      .map((move) => move.from + move.to + (move.promotion ?? ''));
    assert.deepEqual(replies, [step.lines[0][1]], id);
    play(step.lines[0][1]);
    play(step.lines[0][2]);
    assert.equal(game.isCheckmate(), true, id);
  }
});
test('pawn races finish with an actual check and forbid the tempting immediate promotion', () => {
  for (const [id, from, to] of [
    ['endgame-races-1', 'h2', 'h1'],
    ['endgame-races-3', 'h7', 'h8'],
  ]) {
    const lesson = findLesson(id)!;
    const game = new Chess(lesson.steps.at(-1)!.fen);
    assert.equal(game.isCheck(), true);
    assert.throws(() => game.move({ from, to, promotion: 'q' }));
  }
});
test('rule explanations use real pinned and en-passant constraints', () => {
  const pin = new Chess(findLesson('absolute-pin-7')!.steps[0].fen);
  assert.throws(() => pin.move('Rd7'));
  assert.ok(pin.move('Rxe3'));
  const ep = new Chess(findLesson('en-passant-rule-7')!.steps[0].fen);
  assert.throws(() => ep.move({ from: 'g5', to: 'f6' }));
});
test('all 402 completed lessons persist inside the bounded progress format', () => {
  const storage = memoryStorage();
  const progress = readLearning(lessons, storage);
  for (const lesson of lessons)
    lesson.steps.forEach((step, cursor) =>
      applyStepRecord(progress, lesson, cursor, complete(step)),
    );
  updateLearning(lessons, (data) => Object.assign(data, progress), storage);
  const restored = readLearning(lessons, storage);
  assert.equal(Object.keys(restored.entries).length, 402);
  for (const course of courses) {
    assert.equal(courseStats(course, restored).finished, true, course.id);
    assert.equal(courseStats(course, restored).mastered, true, course.id);
  }
});
test('difficulty metadata is bounded and independent checkups remain discoverable', () => {
  assert.deepEqual(new Set(lessons.map(lessonDifficulty)), new Set([1, 2, 3, 4, 5]));
  assert.equal(lessons.filter((lesson) => lesson.challenge).length, 5);
  assert.throws(() => validateLesson({ ...lessons[0], difficulty: 0 }));
  assert.throws(() => validateLesson({ ...lessons[0], difficulty: 6 }));
  assert.throws(() => validateLesson({ ...lessons[0], challenge: 'yes' }));
});
