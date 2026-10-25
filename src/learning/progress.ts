import type { LessonDefinition } from './schema';
import { StepSession, type StepSnapshot } from './session';
export type StepRecord = {
  completed: boolean;
  mastered: boolean;
  needsReview: boolean;
  snapshot: StepSnapshot;
  updated: number;
};
export type LessonProgress = {
  revision: number;
  cursor: number;
  favorite: boolean;
  note: string;
  visited: number;
  steps: Record<string, StepRecord>;
};
export type LearningProgress = {
  version: 1;
  lastLesson: string;
  entries: Record<string, LessonProgress>;
};
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
const key = 'bastion.learning.v1';
export const emptyLessonProgress = (lesson: LessonDefinition): LessonProgress => ({
  revision: lesson.revision,
  cursor: 0,
  favorite: false,
  note: '',
  visited: 0,
  steps: {},
});
export function lessonStats(lesson: LessonDefinition, entry?: LessonProgress) {
  const complete = lesson.steps.filter((s) => entry?.steps[s.id]?.completed).length;
  const review = lesson.steps.filter((s) => entry?.steps[s.id]?.needsReview).length;
  return {
    complete,
    total: lesson.steps.length,
    review,
    finished: complete === lesson.steps.length,
  };
}
export function readLearning(
  catalog: LessonDefinition[],
  storage: StoragePort = localStorage,
): LearningProgress {
  const result: LearningProgress = { version: 1, lastLesson: '', entries: {} };
  try {
    const raw = storage.getItem(key);
    if (raw && raw.length > 1_000_000) return result;
    const data = raw ? JSON.parse(raw) : null;
    if (
      data &&
      (data.version !== 1 ||
        typeof data.entries !== 'object' ||
        !data.entries ||
        Array.isArray(data.entries))
    )
      return result;
    for (const lesson of catalog) {
      const entry = data?.entries[lesson.id];
      if (!entry || typeof entry !== 'object') continue;
      const clean = emptyLessonProgress(lesson);
      clean.favorite = entry.favorite === true;
      clean.note = typeof entry.note === 'string' ? entry.note.slice(0, 2000) : '';
      clean.visited = Number.isFinite(entry.visited) && entry.visited >= 0 ? entry.visited : 0;
      if (entry.revision === lesson.revision) {
        clean.cursor = Number.isInteger(entry.cursor)
          ? Math.max(0, Math.min(lesson.steps.length - 1, entry.cursor))
          : 0;
        for (const step of lesson.steps) {
          const record = entry.steps?.[step.id];
          if (!record || !Number.isFinite(record.updated) || record.updated < 0) continue;
          const session = new StepSession(step, record.snapshot);
          clean.steps[step.id] = {
            completed: record.completed === true,
            mastered: record.mastered === true && record.completed === true,
            needsReview: record.needsReview === true,
            snapshot: session.snapshot(),
            updated: record.updated,
          };
        }
      }
      result.entries[lesson.id] = clean;
    }
    result.lastLesson = catalog.some((l) => l.id === data?.lastLesson) ? data.lastLesson : '';
    if (!raw && storage.getItem('bastion.lesson.backrank') === 'complete') {
      const lesson = catalog.find((l) => l.id === 'backrank');
      const step = lesson?.steps.find((s) => s.id === 'mate');
      if (lesson && step) {
        const session = new StepSession(step);
        if (session.move('e1e8'))
          result.entries[lesson.id] = {
            ...emptyLessonProgress(lesson),
            steps: {
              [step.id]: {
                completed: true,
                mastered: false,
                needsReview: false,
                snapshot: session.snapshot(),
                updated: 0,
              },
            },
          };
      }
    }
  } catch {
    /* Corrupt storage never prevents opening a lesson. */
  }
  return result;
}
export function updateLearning(
  catalog: LessonDefinition[],
  change: (data: LearningProgress) => void,
  storage: StoragePort = localStorage,
) {
  const data = readLearning(catalog, storage);
  change(data);
  const raw = JSON.stringify(data);
  if (raw.length > 1_000_000)
    throw new Error('Хранилище обучения заполнено. Прогресс этого действия пока не сохранён.');
  try {
    storage.setItem(key, raw);
  } catch {
    throw new Error(
      'Не удалось сохранить прогресс. Проверьте доступ браузера к хранилищу и свободное место.',
    );
  }
  return data;
}
export function recordStep(
  catalog: LessonDefinition[],
  lesson: LessonDefinition,
  cursor: number,
  snapshot: StepSnapshot,
  storage?: StoragePort,
) {
  if (!Number.isInteger(cursor) || cursor < 0 || cursor >= lesson.steps.length)
    throw new Error('Неизвестный шаг урока.');
  return updateLearning(
    catalog,
    (data) => {
      const entry = (data.entries[lesson.id] ??= emptyLessonProgress(lesson));
      const step = lesson.steps[cursor];
      const old = entry.steps[step.id];
      const assisted = snapshot.hints > 0 || snapshot.revealed || snapshot.mistakes > 0;
      entry.steps[step.id] = {
        completed: !!old?.completed || snapshot.complete,
        mastered: !!old?.mastered || (snapshot.complete && !assisted),
        needsReview: snapshot.complete ? assisted : !!old?.needsReview,
        snapshot,
        updated: Date.now(),
      };
      entry.cursor = cursor;
      entry.visited = Date.now();
      data.lastLesson = lesson.id;
    },
    storage,
  );
}
export function lessonLink(id: string) {
  return `#lesson/${encodeURIComponent(id)}`;
}
