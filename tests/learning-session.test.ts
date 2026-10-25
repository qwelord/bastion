import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lessons } from '../src/learning/catalog.ts';
import {
  applyUci,
  validateLesson,
  validateCurriculum,
  type MoveStep,
} from '../src/learning/schema.ts';
import { StepSession } from '../src/learning/session.ts';
import { ChessGame } from '../src/chess/rules.ts';
const copy = () => structuredClone(lessons[0]);
const fork = lessons.find((l) => l.id === 'knight-fork')!.steps.find((s) => s.kind === 'move')!;
test('lesson authoring rejects missing and reserved IDs and invalid body types', () => {
  for (const id of [undefined, null, 123, 'constructor', '__proto__', 'bad id'])
    assert.throws(() => validateLesson({ ...copy(), id }));
  const lesson = copy();
  lesson.steps[0].body = [''];
  assert.throws(() => validateLesson(lesson));
  assert.throws(() => validateLesson({ ...copy(), schemaVersion: 2 }));
});
test('curriculum rejects duplicate lessons unknown dependencies and dependency cycles', () => {
  assert.throws(() => validateCurriculum([copy(), copy()]));
  assert.throws(() => validateCurriculum([{ ...copy(), prerequisites: ['missing'] }]));
  const first = { ...copy(), id: 'first', prerequisites: ['second'] };
  const second = { ...copy(), id: 'second', prerequisites: ['first'] };
  assert.throws(() => validateCurriculum([first, second]));
});
test('authoring rejects illegal examples and solutions that do not reach their stated goal', () => {
  const lesson = structuredClone(lessons.find((l) => l.id === 'backrank')!);
  const move = lesson.steps.find((s) => s.kind === 'move') as MoveStep;
  move.lines = [['e1e7']];
  assert.throws(() => validateLesson(lesson));
  move.lines = [['e1f3']];
  assert.throws(() => validateLesson(lesson));
  const example = copy();
  if (example.steps[0].kind === 'explain') example.steps[0].line = ['e2e5'];
  assert.throws(() => validateLesson(example));
});
test('authoring refuses ambiguous automatic responses and prefix solutions', () => {
  const lesson = structuredClone(lessons.find((l) => l.id === 'opening-principles')!);
  const move = lesson.steps.find((s) => s.kind === 'move') as MoveStep;
  move.lines = [
    ['e2e4', 'e7e5', 'g1f3'],
    ['e2e4', 'c7c5', 'g1f3'],
  ];
  assert.throws(() => validateLesson(lesson));
  move.lines = [['e2e4'], ['e2e4', 'e7e5', 'g1f3']];
  assert.throws(() => validateLesson(lesson));
  move.lines = [['e2e4']];
  move.goal = 'unknown' as never;
  assert.throws(() => validateLesson(lesson));
});
test('legal but incorrect moves and illegal moves leave the teaching position unchanged', () => {
  const session = new StepSession(fork);
  const fen = session.game.fen();
  assert.equal(session.move('d5b4'), false);
  assert.equal(session.game.fen(), fen);
  assert.equal(session.move('d5d6'), false);
  assert.equal(session.game.fen(), fen);
  assert.equal(session.state.mistakes, 2);
  assert.equal(session.game.history().length, 0);
});
test('multi-move exercise restores between learner turns and completes the capture', () => {
  const session = new StepSession(fork);
  assert.ok(session.move('d5c7'));
  assert.equal(session.state.complete, false);
  assert.deepEqual(session.state.trail, ['d5c7', 'e8d7']);
  const restored = new StepSession(fork, JSON.parse(JSON.stringify(session.snapshot())));
  assert.equal(restored.game.fen(), session.game.fen());
  assert.ok(restored.move('c7a8'));
  assert.equal(restored.state.complete, true);
  assert.equal(restored.game.position().a8, 'wn');
  assert.equal(restored.game.history().at(-1)?.captured, 'q');
});
test('invalid or non-solution resume trails cannot skip an exercise', () => {
  const fresh = new StepSession(fork);
  const snapshot = fresh.snapshot();
  for (const patch of [
    { trail: ['d5b4'] },
    { trail: ['d5c7'], complete: false },
    { trail: ['d5c7', 'e8d7'], complete: true },
    { mistakes: 2, attempts: 1 },
  ]) {
    const restored = new StepSession(fork, { ...snapshot, ...patch });
    assert.equal(restored.state.complete, false);
    assert.equal(restored.game.fen(), fresh.game.fen());
  }
});
test('mate exercise accepts a legal alternative mate missing from authored main line', () => {
  const step: MoveStep = {
    ...fork,
    kind: 'move',
    fen: '6k1/5ppp/8/8/4Q3/8/5PPP/6K1 w - - 0 1',
    lines: [['e4e8']],
    goal: 'mate',
  };
  const session = new StepSession(step);
  assert.ok(session.move('e4a8'));
  assert.equal(session.game.outcome()?.reason, 'Мат');
  assert.equal(new StepSession(step, session.snapshot()).state.complete, true);
});
test('lesson session supports black to move without assigning a white player', () => {
  const step: MoveStep = {
    ...fork,
    kind: 'move',
    fen: '4r1k1/8/8/8/8/8/4P3/6K1 b - - 0 1',
    lines: [['e8e2']],
    goal: 'capture',
  };
  const session = new StepSession(step);
  assert.equal(session.game.turn(), 'b');
  assert.ok(session.move('e8e2'));
  assert.equal(session.state.complete, true);
});
test('hints are bounded reveal is marked assisted and retry starts an independent attempt', () => {
  const session = new StepSession(fork);
  for (let i = 0; i < 20; i++) session.hint();
  assert.equal(session.state.hints, fork.kind === 'move' ? fork.hints.length : 0);
  session.reveal();
  assert.equal(session.state.complete, true);
  assert.equal(session.state.revealed, true);
  session.retry();
  assert.equal(session.state.complete, false);
  assert.equal(session.state.hints, 0);
  assert.equal(session.state.revealed, false);
  assert.equal(session.game.history().length, 0);
});
test('choosing an incorrect option cannot complete or advance the question', () => {
  const step = lessons[0].steps.find((s) => s.kind === 'choice')!;
  assert.equal(step.kind, 'choice');
  if (step.kind !== 'choice') return;
  const session = new StepSession(step);
  session.choose('not-a-choice');
  assert.equal(session.state.attempts, 0);
  session.choose(step.options.find((o) => o.id !== step.answer)!.id);
  assert.equal(session.state.complete, false);
  assert.equal(session.status, 'wrong');
  session.choose(step.answer);
  assert.equal(session.state.complete, true);
});
test('square answers require an exact set and retain their selection on resume', () => {
  const step = lessons[0].steps.find((s) => s.kind === 'squares')!;
  if (step.kind !== 'squares') throw new Error();
  const session = new StepSession(step);
  step.targets.forEach((s) => session.toggleSquare(s));
  session.toggleSquare('a1');
  session.checkSquares();
  assert.equal(session.state.complete, false);
  session.toggleSquare('a1');
  const resumed = new StepSession(step, session.snapshot());
  assert.deepEqual(resumed.state.squares, step.targets);
  resumed.checkSquares();
  assert.equal(resumed.state.complete, true);
});
test('authored castling en passant and all promotions alter real board state correctly', () => {
  const castle = lessons.find((l) => l.id === 'castling')!.steps.find((s) => s.kind === 'move')!;
  const session = new StepSession(castle);
  session.move('e1g1');
  assert.equal(session.game.position().f1, 'wr');
  assert.equal(session.game.position().h1, undefined);
  const ep = lessons.find((l) => l.id === 'en-passant')!.steps.find((s) => s.kind === 'move')!;
  const capture = new StepSession(ep);
  capture.move('d5e6');
  assert.equal(capture.game.position().e5, undefined);
  assert.equal(capture.game.position().e6, 'wp');
  const promotion = lessons
    .find((l) => l.id === 'promotion')!
    .steps.find((s) => s.kind === 'move')!;
  for (const piece of ['q', 'r', 'b', 'n']) {
    const attempt = new StepSession(promotion);
    assert.ok(attempt.move('g7g8' + piece));
    assert.equal(attempt.game.position().g8, 'w' + piece);
  }
  const game = new ChessGame();
  assert.equal(applyUci(game, 'e2e4\nquit'), null);
});
