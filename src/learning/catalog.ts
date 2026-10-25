import source from './lessons.json';
import type { LessonDefinition } from './schema';
// Authoring validation runs in tests and before every production build.
export const lessons = source as LessonDefinition[];
export const findLesson = (id: string) => lessons.find((l) => l.id === id);
