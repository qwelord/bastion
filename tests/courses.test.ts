import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import {
  courses,
  validateCourses,
  courseLessons,
  courseStats,
  nextCourseLesson,
  courseForLesson,
} from '../src/learning/courses.ts';
import { lessons } from '../src/learning/catalog.ts';
import { validateCurriculum } from '../src/learning/schema.ts';
import { StepSession } from '../src/learning/session.ts';
import { applyStepRecord, readLearning } from '../src/learning/progress.ts';
test('expanded courses contain distinct real lessons and live exercises', () => {
  validateCurriculum(lessons);
  validateCourses(courses, lessons);
  assert.equal(courses.length, 58);
  assert.equal(new Set(courses.flatMap((c) => c.lessonIds)).size, 390);
  for (const c of courses) {
    assert.equal(c.lessonIds.length, courses.indexOf(c) < 50 ? 7 : 5);
    for (const l of courseLessons(c)) {
      assert.equal(courseForLesson(l.id)?.id, c.id);
      assert.ok(l.steps.some((s) => s.kind !== 'explain'));
      assert.ok(l.steps.some((s) => s.kind === 'explain' && s.body.join('').length > 100));
    }
  }
});
test('course validation refuses missing lessons, shared filler, unsafe IDs and dependency cycles', () => {
  const bad = (change: (data: typeof courses) => void) => {
    const data = structuredClone(courses);
    change(data);
    assert.throws(() => validateCourses(data, lessons));
  };
  bad((d) => {
    d[0].lessonIds[0] = 'missing';
  });
  bad((d) => {
    d[1].lessonIds[0] = d[0].lessonIds[0];
  });
  bad((d) => {
    d[0].lessonIds = [];
  });
  bad((d) => {
    d[0].id = 'constructor';
  });
  bad((d) => {
    d[0].prerequisites = [d[1].id];
    d[1].prerequisites = [d[0].id];
  });
  bad((d) => {
    d[0].prerequisites = ['unknown'];
  });
});
test('course continuation follows incomplete practice and assistance remains visible', () => {
  const storage = { getItem: () => null, setItem: () => {} };
  const progress = readLearning(lessons, storage);
  const c = courses[0];
  assert.equal(nextCourseLesson(c, progress).id, c.lessonIds[0]);
  for (const l of courseLessons(c)) {
    for (const [cursor, step] of l.steps.entries()) {
      const session = new StepSession(step);
      if (step.kind === 'explain') session.read();
      else session.reveal();
      applyStepRecord(progress, l, cursor, session.snapshot());
    }
  }
  assert.equal(courseStats(c, progress).finished, true);
  assert.equal(courseStats(c, progress).mastered, false);
  assert.equal(courseStats(c, progress).review, 7);
  const l = courseLessons(c)[1];
  applyStepRecord(progress, l, 1, new StepSession(l.steps[1]).snapshot());
  assert.equal(nextCourseLesson(c, progress).id, l.id);
  assert.equal(
    courseStats(c, progress).finished,
    true,
    'retry must preserve historical completion',
  );
});
test('underpromotion material distinguishes an actual stalemate from a playable rook ending', () => {
  const l = lessons.find((l) => l.id === 'underpromotion-2')!;
  const queen = new Chess(l.steps[0].fen);
  queen.move({ from: 'c7', to: 'c8', promotion: 'q' });
  assert.equal(queen.isStalemate(), true);
  const rook = new Chess(l.steps[0].fen);
  rook.move({ from: 'c7', to: 'c8', promotion: 'r' });
  assert.equal(rook.isGameOver(), false);
  assert.ok(rook.moves().includes('Ka6'));
});
test('illustrated attacks match the teaching position rather than only legal notation', () => {
  const check = (id: string, squares: string[], color: 'w' | 'b') => {
    const game = new Chess(lessons.find((l) => l.id === id)!.steps[0].fen);
    for (const square of squares)
      assert.ok(game.isAttacked(square as 'e4', color), `${id}: ${square}`);
  };
  check('knight-forks-1', ['a8', 'e8'], 'w');
  check('pawn-forks-2', ['d6', 'f6'], 'w');
  check('double-check-2', ['e8'], 'w');
  check('active-king-2', ['c5', 'e5', 'g5'], 'b');
  for (const id of ['mate-draw-1'])
    assert.equal(new Chess(lessons.find((l) => l.id === id)!.steps[0].fen).isCheckmate(), true);
  assert.equal(
    new Chess(lessons.find((l) => l.id === 'mate-draw-2')!.steps[0].fen).isStalemate(),
    true,
  );
});
