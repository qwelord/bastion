import { readFile, writeFile } from 'node:fs/promises';
import { material } from '../content/course-material.mjs';
const lessonPath = new URL('../src/learning/lessons.json', import.meta.url);
const existing = JSON.parse(await readFile(lessonPath, 'utf8'));
const generatedIds = new Set(material.flatMap((c) => c.units.map((_, i) => `${c.id}-${i + 1}`)));
const lessons = existing.filter((l) => !generatedIds.has(l.id));
const courses = [];
const lastInTrack = new Map();
for (const [courseIndex, course] of material.entries()) {
  const previous = lastInTrack.get(course.track);
  const lessonIds = course.units.map((_, i) => `${course.id}-${i + 1}`);
  courses.push({
    schemaVersion: 1,
    id: course.id,
    title: course.title,
    track: course.track,
    outcome: course.outcome,
    lessonIds,
    prerequisites: previous ? [previous] : [],
  });
  lastInTrack.set(course.track, course.id);
  for (const [index, unit] of course.units.entries()) {
    const task = {
      id: 'practice',
      kind: unit.kind,
      title: unit.title,
      fen: unit.fen,
      body: [unit.question],
      success: unit.success,
      hints: [unit.body],
    };
    if (unit.kind === 'move')
      Object.assign(task, {
        lines: unit.lines,
        ...(unit.goal ? { goal: unit.goal } : {}),
        hints: [
          'Проверьте указанную цель и безопасный путь фигуры.',
          `Начните с ${unit.lines[0][0].slice(0, 2)}–${unit.lines[0][0].slice(2)}.`,
        ],
      });
    if (unit.kind === 'squares')
      Object.assign(task, {
        targets: unit.targets,
        hints: [
          unit.body,
          `Нужно отметить ${unit.targets.length} полей. Одно из них — ${unit.targets[0]}.`,
        ],
      });
    if (unit.kind === 'choice') {
      task.options = unit.options.map((label, i) => ({
        id: ['right', 'alternative', 'other'][i],
        label,
        feedback: i === 0 ? unit.success : `Этот ответ не подходит. ${unit.success}`,
      }));
      const shift = (courseIndex + index) % 3;
      task.options = [...task.options.slice(shift), ...task.options.slice(0, shift)];
      task.answer = 'right';
    }
    lessons.push({
      schemaVersion: 1,
      id: lessonIds[index],
      revision: unit.revision ?? 1,
      title: unit.title,
      summary: unit.question,
      objective: unit.question,
      level: ['Первые ходы', 'Правила и старт'].includes(course.track) ? 'Основы' : 'Практика',
      topic: course.track,
      minutes: 3,
      prerequisites: index ? [lessonIds[index - 1]] : [],
      steps: [
        { id: 'idea', kind: 'explain', title: unit.title, fen: unit.fen, body: [unit.body] },
        task,
      ],
      takeaways: [unit.success],
    });
  }
}
await writeFile(lessonPath, JSON.stringify(lessons, null, 2) + '\n');
await writeFile(
  new URL('../src/learning/courses.json', import.meta.url),
  JSON.stringify(courses, null, 2) + '\n',
);
console.log(
  `Authored ${courses.length} courses and ${generatedIds.size} lessons; retained ${existing.length - existing.filter((l) => generatedIds.has(l.id)).length} starter lessons.`,
);
