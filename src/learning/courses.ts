import source from './courses.json';
import { findLesson } from './catalog';
import type { LessonDefinition } from './schema';
import { hasOpenAttempt, lessonStats, type LearningProgress } from './progress';
export type CourseDefinition = {
  schemaVersion: 1;
  id: string;
  title: string;
  aliases?: string[];
  track: string;
  outcome: string;
  lessonIds: string[];
  prerequisites: string[];
};
export function validateCourses(input: unknown, catalog: LessonDefinition[]): CourseDefinition[] {
  if (!Array.isArray(input) || !input.length || input.length > 1000)
    throw new Error('Ожидается непустой каталог курсов.');
  const ids = new Set<string>();
  const used = new Set<string>();
  const known = new Set(catalog.map((l) => l.id));
  const id = (v: unknown): v is string =>
    typeof v === 'string' &&
    /^[a-z][a-z0-9-]{0,63}$/.test(v) &&
    !['constructor', 'prototype'].includes(v);
  const text = (v: unknown, max: number) =>
    typeof v === 'string' && v.trim().length > 0 && v.length <= max;
  for (const c of input) {
    if (
      !c ||
      c.schemaVersion !== 1 ||
      !id(c.id) ||
      ids.has(c.id) ||
      !text(c.title, 120) ||
      (c.aliases !== undefined &&
        (!Array.isArray(c.aliases) ||
          c.aliases.length > 10 ||
          !c.aliases.every((alias: unknown) => text(alias, 160)))) ||
      !text(c.track, 80) ||
      !text(c.outcome, 600) ||
      !Array.isArray(c.lessonIds) ||
      c.lessonIds.length < 3 ||
      c.lessonIds.length > 64 ||
      !Array.isArray(c.prerequisites) ||
      c.prerequisites.length > 10 ||
      !c.prerequisites.every(id)
    )
      throw new Error('Неверный курс или повторяющийся ID.');
    ids.add(c.id);
    for (const lesson of c.lessonIds) {
      if (!id(lesson) || !known.has(lesson) || used.has(lesson))
        throw new Error(`${c.id}: урок отсутствует или включён в несколько курсов.`);
      used.add(lesson);
    }
  }
  const courses = input as CourseDefinition[];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (c: CourseDefinition) => {
    if (visiting.has(c.id)) throw new Error('Цикл зависимостей курсов.');
    if (visited.has(c.id)) return;
    visiting.add(c.id);
    for (const prerequisite of c.prerequisites) {
      const target = courses.find((v) => v.id === prerequisite);
      if (!target) throw new Error(`${c.id}: неизвестный предыдущий курс.`);
      visit(target);
    }
    visiting.delete(c.id);
    visited.add(c.id);
  };
  courses.forEach(visit);
  return courses;
}
// Bundled content is validated by the build, not during a player's first board interaction.
export const courses = source as CourseDefinition[];
export const courseLessons = (c: CourseDefinition) => c.lessonIds.map((id) => findLesson(id)!);
const courseIndex = new Map(
  courses.flatMap((course) => course.lessonIds.map((id) => [id, course] as const)),
);
export const courseForLesson = (id: string) => courseIndex.get(id);
export const courseLink = (id: string) => `#learn/course/${id}`;
export function courseStats(c: CourseDefinition, progress: LearningProgress) {
  const list = courseLessons(c);
  const stats = list.map((l) => lessonStats(l, progress.entries[l.id]));
  return {
    finished: stats.every((s) => s.finished),
    complete: stats.filter((s) => s.finished).length,
    steps: stats.reduce((n, s) => n + s.complete, 0),
    total: stats.reduce((n, s) => n + s.total, 0),
    review: stats.reduce((n, s) => n + s.review, 0),
    mastered: list.every((l) =>
      l.steps.every((s) => progress.entries[l.id]?.steps[s.id]?.mastered),
    ),
    visited: list.some((l) => !!progress.entries[l.id]?.visited),
    favorite: list.some((l) => !!progress.entries[l.id]?.favorite),
    minutes: list.reduce((n, l) => n + l.minutes, 0),
  };
}
export function nextCourseLesson(c: CourseDefinition, progress: LearningProgress) {
  const list = courseLessons(c);
  return (
    list.find((l) => l.id === progress.lastLesson && hasOpenAttempt(l, progress.entries[l.id])) ??
    list.find((l) => !lessonStats(l, progress.entries[l.id]).finished) ??
    list[0]
  );
}
