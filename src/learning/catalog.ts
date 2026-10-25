import source from './lessons.json';
import { validateCurriculum } from './schema';
export const lessons = validateCurriculum(source);
export const findLesson = (id: string) => lessons.find((l) => l.id === id);
