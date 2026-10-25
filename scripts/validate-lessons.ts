import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateCurriculum } from '../src/learning/schema.ts';
import { validateCourses } from '../src/learning/courses.ts';
const url = process.argv[2]
  ? pathToFileURL(resolve(process.argv[2]))
  : new URL('../src/learning/lessons.json', import.meta.url);
try {
  const input = JSON.parse(await readFile(url, 'utf8'));
  const lessons = validateCurriculum(input);
  if (!process.argv[2]) {
    const courses = validateCourses(JSON.parse(await readFile(new URL('../src/learning/courses.json', import.meta.url), 'utf8')), lessons);
    console.log(`Course validation passed: ${courses.length} courses.`);
  }
  console.log(
    `Lesson validation passed: ${lessons.length} lessons, ${lessons.reduce((n, l) => n + l.steps.length, 0)} steps.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
