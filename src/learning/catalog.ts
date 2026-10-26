import source from './lessons.json';
import type { LessonDefinition } from './schema';
// Authoring validation runs in tests and before every production build.
export const lessons = source as LessonDefinition[];
const lessonIndex = new Map(lessons.map((lesson) => [lesson.id, lesson]));
export const findLesson = (id: string) => lessonIndex.get(id);
export const difficultyLabels = [
  'Все сложности',
  'Знакомство',
  'Закрепление',
  'Применение',
  'Углубление',
  'Сложный расчёт',
] as const;
export const lessonDifficulty = (lesson: LessonDefinition) =>
  lesson.difficulty ?? (lesson.level === 'Основы' ? 1 : lesson.level === 'Практика' ? 3 : 5);
