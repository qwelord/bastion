import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lessons } from '../src/learning/catalog.ts';
import { StepSession } from '../src/learning/session.ts';
import {
  readLearning,
  recordStep,
  lessonStats,
  updateLearning,
  emptyLessonProgress,
} from '../src/learning/progress.ts';
function memory(initial?: string) {
  const values = new Map<string, string>(initial ? [['bastion.learning.v1', initial]] : []);
  return {
    values,
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
  };
}
const lesson = lessons[0];
test('progress remembers exact step and partial selections across launches', () => {
  const storage = memory();
  const session = new StepSession(lesson.steps[1]);
  session.toggleSquare('d4');
  recordStep(lessons, lesson, 1, session.snapshot(), storage);
  const saved = readLearning(lessons, storage);
  assert.equal(saved.lastLesson, lesson.id);
  assert.equal(saved.entries[lesson.id].cursor, 1);
  assert.deepEqual(saved.entries[lesson.id].steps.center.snapshot.squares, ['d4']);
  assert.equal(lessonStats(lesson, saved.entries[lesson.id]).finished, false);
});
test('mistakes enter the review queue and a clean repeat clears it without erasing completion', () => {
  const storage = memory();
  const session = new StepSession(lesson.steps[1]);
  session.toggleSquare('a1');
  session.checkSquares();
  recordStep(lessons, lesson, 1, session.snapshot(), storage);
  assert.equal(readLearning(lessons, storage).entries[lesson.id].steps.center.needsReview, true);
  session.reveal();
  recordStep(lessons, lesson, 1, session.snapshot(), storage);
  session.retry();
  recordStep(lessons, lesson, 1, session.snapshot(), storage);
  assert.equal(readLearning(lessons, storage).entries[lesson.id].steps.center.completed, true);
  for (const s of ['d4', 'd5', 'e4', 'e5']) session.toggleSquare(s);
  session.checkSquares();
  recordStep(lessons, lesson, 1, session.snapshot(), storage);
  const result = readLearning(lessons, storage).entries[lesson.id].steps.center;
  assert.equal(result.needsReview, false);
  assert.equal(result.mastered, true);
});
test('writing a different lesson rereads storage and preserves earlier progress and notes', () => {
  const storage = memory();
  const first = new StepSession(lesson.steps[0]);
  first.read();
  recordStep(lessons, lesson, 0, first.snapshot(), storage);
  updateLearning(
    lessons,
    (data) => {
      data.entries[lesson.id].note = 'Моя формулировка';
      data.entries[lesson.id].favorite = true;
    },
    storage,
  );
  const other = lessons[1];
  const second = new StepSession(other.steps[0]);
  second.read();
  recordStep(lessons, other, 0, second.snapshot(), storage);
  const saved = readLearning(lessons, storage);
  assert.equal(saved.entries[lesson.id].note, 'Моя формулировка');
  assert.equal(saved.entries[lesson.id].favorite, true);
  assert.equal(saved.entries[other.id].steps.rook.completed, true);
});
test('new content revision resets outdated solutions while preserving personal notes and favorite', () => {
  const storage = memory();
  const first = new StepSession(lesson.steps[0]);
  first.read();
  recordStep(lessons, lesson, 0, first.snapshot(), storage);
  updateLearning(
    lessons,
    (data) => {
      data.entries[lesson.id].note = 'Заметка';
      data.entries[lesson.id].favorite = true;
    },
    storage,
  );
  const revised = { ...lesson, revision: lesson.revision + 1 };
  const entry = readLearning([revised], storage).entries[lesson.id];
  assert.deepEqual(entry.steps, {});
  assert.equal(entry.note, 'Заметка');
  assert.equal(entry.favorite, true);
});
test('legacy backrank completion migrates only the matching task rather than the whole new lesson', () => {
  const storage = memory();
  storage.setItem('bastion.lesson.backrank', 'complete');
  const back = lessons.find((l) => l.id === 'backrank')!;
  const entry = readLearning(lessons, storage).entries.backrank;
  assert.equal(entry.steps.mate.completed, true);
  assert.equal(lessonStats(back, entry).complete, 1);
  assert.equal(lessonStats(back, entry).finished, false);
});
test('invalid and unknown storage versions do not crash reads and cannot be overwritten silently', () => {
  for (const raw of ['{broken', '{"version":2,"entries":{}}', '{"version":1,"entries":[]}']) {
    const storage = memory(raw);
    assert.deepEqual(readLearning(lessons, storage).entries, {});
    assert.throws(() => updateLearning(lessons, () => {}, storage));
    assert.equal(storage.getItem('bastion.learning.v1'), raw);
  }
});
test('storage quota errors are explicit rather than reported as successful saving', () => {
  const storage = {
    getItem: () => null,
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
  };
  assert.throws(
    () => recordStep(lessons, lesson, 0, new StepSession(lesson.steps[0]).snapshot(), storage),
    /Не удалось сохранить/,
  );
});
test('unknown steps are ignored notes are bounded and malicious cursor cannot escape a lesson', () => {
  const entry = {
    ...emptyLessonProgress(lesson),
    cursor: 999,
    note: 'x'.repeat(3000),
    steps: { unknown: { completed: true } },
  };
  const storage = memory(
    JSON.stringify({ version: 1, lastLesson: 'missing', entries: { [lesson.id]: entry } }),
  );
  const data = readLearning(lessons, storage);
  assert.equal(data.entries[lesson.id].cursor, lesson.steps.length - 1);
  assert.equal(data.entries[lesson.id].note.length, 2000);
  assert.deepEqual(data.entries[lesson.id].steps, {});
  assert.equal(data.lastLesson, '');
});

test('repeating a completed step remains resumable without reducing prior completion', async () => {
  const { hasOpenAttempt } = await import('../src/learning/progress.ts');
  const storage = memory();
  const session = new StepSession(lesson.steps[1]);
  session.reveal();
  recordStep(lessons, lesson, 1, session.snapshot(), storage);
  session.retry();
  session.toggleSquare('e4');
  recordStep(lessons, lesson, 1, session.snapshot(), storage);
  const entry = readLearning(lessons, storage).entries[lesson.id];
  assert.equal(entry.steps.center.completed, true);
  assert.equal(hasOpenAttempt(lesson, entry), true);
  assert.deepEqual(entry.steps.center.snapshot.squares, ['e4']);
});
