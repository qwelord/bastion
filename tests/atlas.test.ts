import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import baseline from './fixtures/curriculum-v06.json';
import references from '../content/opening-sources.json';
import { Chess } from 'chess.js';
import { findLesson, lessons } from '../src/learning/catalog.ts';
import { courses } from '../src/learning/courses.ts';
import { learningAreas, learningLocation, areaForTrack } from '../src/learning/navigation.ts';
import {
  readLearning,
  updateLearning,
  emptyLessonProgress,
  learningStorageLimit,
} from '../src/learning/progress.ts';

test('all 402 previously published lesson definitions survive the expansion unchanged', () => {
  for (const [id, digest] of Object.entries(baseline)) {
    const lesson = findLesson(id);
    assert.ok(lesson, id);
    assert.equal(createHash('sha256').update(JSON.stringify(lesson)).digest('hex'), digest, id);
  }
  assert.equal(Object.keys(baseline).length, 402);
});

test('92 opening examples retain named source prefixes and playable demonstrations for both sides', () => {
  assert.equal(references.license, 'CC0-1.0');
  assert.equal(references.branches.length, 92);
  assert.equal(new Set(references.branches.map((branch) => branch.course)).size, 46);
  for (const branch of references.branches) {
    const reference = new Chess();
    reference.loadPgn(branch.referencePgn);
    const authored = new Chess();
    branch.teachingLine
      .split(' ')
      .slice(0, branch.referencePlies)
      .forEach((move) => authored.move(move));
    assert.equal(authored.fen(), reference.fen(), branch.course);
  }
  for (const course of courses.filter(
    (course) => course.id.startsWith('opening-') && course.lessonIds.length === 10,
  )) {
    assert.deepEqual(course.prerequisites, ['opening-center', 'develop-pieces']);
    for (const first of [0, 5]) {
      const a = findLesson(course.lessonIds[first])!;
      const b = findLesson(course.lessonIds[first + 1])!;
      assert.notEqual(new Chess(a.steps[0].fen).turn(), new Chess(b.steps[0].fen).turn());
      assert.equal(a.steps[0].kind === 'explain' && a.steps[0].line?.length, 3);
    }
  }
});

test('new strategic warnings describe the actual geometry and legal replies', () => {
  const initial = (id: string) => new Chess(findLesson(id)!.steps[0].fen);
  const final = (id: string) => new Chess(findLesson(id)!.steps.at(-1)!.fen);
  assert.equal(final('rook-behind-lab-3').get('a8')?.type, 'r');
  assert.equal(final('rook-behind-lab-3').get('a4')?.color, 'b');
  assert.equal(final('minor-piece-lab-5').squareColor('b7'), 'light');
  assert.equal(final('minor-piece-lab-5').squareColor('e3'), 'dark');
  assert.ok(final('outposts-lab-3').moves().includes('fxe4'));
  assert.ok(final('rook-activity-lab-5').moves().includes('Kxe4'));
  assert.ok(final('promotion-lab-5').moves().includes('Kxc8'));
  assert.equal(final('promotion-lab-1').isCheck(), false);
  assert.equal(final('promotion-lab-3').isCheck(), true);
  assert.ok(final('promotion-lab-3').isAttacked('g7', 'w'));
  assert.equal(final('mating-net-lab-1').isCheckmate(), true);
  assert.equal(final('mating-net-lab-3').isCheckmate(), true);
  assert.equal(final('mating-net-lab-5').isStalemate(), false);
  assert.ok(final('mating-net-lab-5').moves().includes('a6'));
  assert.equal(initial('defence-lab-1').isCheck(), true);
  assert.equal(final('defence-lab-1').isCheck(), false);
});

test('learning navigation restricts URL values and every course has a discoverable area', () => {
  assert.deepEqual(learningLocation('#learn/lessons?filter=review&area=openings'), {
    path: '#learn/lessons',
    area: 'openings',
    filter: 'Повторить',
  });
  assert.deepEqual(learningLocation('#learn?area=constructor&filter=__proto__'), {
    path: '#learn',
    area: '',
    filter: 'Все',
  });
  assert.ok(
    courses.every((course) => learningAreas.some((area) => area.id === areaForTrack(course.track))),
  );
  assert.equal(courses.filter((course) => areaForTrack(course.track) === 'openings').length, 46);
});

test('cached progress remains isolated and new saved values invalidate restored entries', () => {
  let raw = '';
  const storage = {
    getItem: () => raw || null,
    setItem: (_: string, value: string) => {
      raw = value;
    },
  };
  const lesson = lessons[0];
  updateLearning(
    lessons,
    (data) => {
      data.entries[lesson.id] = emptyLessonProgress(lesson);
      data.entries[lesson.id].note = 'До';
    },
    storage,
  );
  const first = readLearning(lessons, storage);
  first.entries[lesson.id].note = 'Не сохранено';
  assert.equal(readLearning(lessons, storage).entries[lesson.id].note, 'До');
  updateLearning(
    lessons,
    (data) => {
      data.entries[lesson.id].note = 'После';
    },
    storage,
  );
  assert.equal(readLearning(lessons, storage).entries[lesson.id].note, 'После');
  raw = ' '.repeat(learningStorageLimit + 1);
  assert.deepEqual(readLearning(lessons, storage).entries, {});
  assert.throws(() => updateLearning(lessons, () => {}, storage));
  assert.equal(raw.length, learningStorageLimit + 1, 'oversized saves must never be overwritten');
});
