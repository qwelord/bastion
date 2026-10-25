import { ChessGame } from '../chess/rules';
export type StepBase = { id: string; title: string; body: string[]; fen: string; focus?: string[] };
export type ExplainStep = StepBase & { kind: 'explain'; line?: string[] };
export type ChoiceStep = StepBase & {
  kind: 'choice';
  options: { id: string; label: string; feedback: string }[];
  answer: string;
  success: string;
  hints: string[];
};
export type SquaresStep = StepBase & {
  kind: 'squares';
  targets: string[];
  success: string;
  hints: string[];
};
export type MoveStep = StepBase & {
  kind: 'move';
  lines: string[][];
  success: string;
  hints: string[];
  goal?: 'mate' | 'capture' | 'promotion' | 'castle';
  wrong?: { move: string; text: string }[];
};
export type LessonStep = ExplainStep | ChoiceStep | SquaresStep | MoveStep;
export type LessonDefinition = {
  schemaVersion: 1;
  id: string;
  revision: number;
  title: string;
  summary: string;
  objective: string;
  level: 'Основы' | 'Практика' | 'Мастерство';
  topic: string;
  minutes: number;
  prerequisites: string[];
  steps: LessonStep[];
  takeaways: string[];
};
const idPattern = /^[a-z][a-z0-9-]{0,63}$/;
const validId = (id: unknown) =>
  typeof id === 'string' &&
  idPattern.test(id) &&
  !['constructor', 'prototype', '__proto__'].includes(id);
const movePattern = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
const squarePattern = /^[a-h][1-8]$/;
function demand(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
function text(value: unknown, limit = 1500) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= limit;
}
function texts(value: unknown, min: number, max: number) {
  return (
    Array.isArray(value) &&
    value.length >= min &&
    value.length <= max &&
    value.every((v) => text(v))
  );
}
export function applyUci(game: ChessGame, move: string) {
  if (!movePattern.test(move)) return null;
  return game.play({
    from: move.slice(0, 2),
    to: move.slice(2, 4),
    ...(move[4] ? { promotion: move[4] as 'q' | 'r' | 'b' | 'n' } : {}),
  });
}
export function validateLesson(input: unknown): LessonDefinition {
  demand(
    input && typeof input === 'object' && JSON.stringify(input).length <= 128_000,
    'Урок отсутствует или превышает 128 КБ.',
  );
  const lesson = input as LessonDefinition;
  const fail = (s: string) => `${lesson.id ?? '?'}: ${s}`;
  demand(lesson.schemaVersion === 1 && validId(lesson.id), fail('неверная версия или ID'));
  demand(Number.isInteger(lesson.revision) && lesson.revision > 0, fail('неверная ревизия'));
  demand(
    text(lesson.title, 120) &&
      text(lesson.summary, 400) &&
      text(lesson.objective, 400) &&
      text(lesson.topic, 80),
    fail('пустой или длинный текст'),
  );
  demand(['Основы', 'Практика', 'Мастерство'].includes(lesson.level), fail('неверный уровень'));
  demand(
    Number.isInteger(lesson.minutes) && lesson.minutes >= 1 && lesson.minutes <= 60,
    fail('неверная длительность'),
  );
  demand(
    Array.isArray(lesson.prerequisites) &&
      lesson.prerequisites.length <= 10 &&
      lesson.prerequisites.every(validId),
    fail('неверные зависимости'),
  );
  demand(texts(lesson.takeaways, 1, 5), fail('нужны выводы'));
  demand(
    Array.isArray(lesson.steps) && lesson.steps.length >= 2 && lesson.steps.length <= 64,
    fail('ожидается 2–64 шага'),
  );
  const ids = new Set<string>();
  let exercises = 0;
  for (const step of lesson.steps) {
    demand(step && validId(step.id) && !ids.has(step.id), fail('повторяющийся ID шага'));
    ids.add(step.id);
    demand(text(step.title, 160) && texts(step.body, 1, 5), fail(`${step.id}: неверный текст`));
    new ChessGame(step.fen);
    demand(
      !step.focus ||
        (Array.isArray(step.focus) &&
          step.focus.length <= 16 &&
          step.focus.every((s) => squarePattern.test(s))),
      fail(`${step.id}: неверная подсветка`),
    );
    if (step.kind === 'explain') {
      if (step.line) {
        demand(Array.isArray(step.line) && step.line.length <= 20, fail('пример слишком длинный'));
        const game = new ChessGame(step.fen);
        for (const move of step.line)
          demand(applyUci(game, move), fail(`${step.id}: нелегальный пример ${move}`));
      }
      continue;
    }
    exercises++;
    demand(
      text(step.success) && texts(step.hints, 1, 3),
      fail(`${step.id}: нужны обратная связь и подсказки`),
    );
    if (step.kind === 'choice') {
      demand(
        Array.isArray(step.options) && step.options.length >= 2 && step.options.length <= 6,
        fail('ожидается 2–6 ответов'),
      );
      demand(
        new Set(step.options.map((o) => o.id)).size === step.options.length &&
          step.options.every((o) => validId(o.id) && text(o.label, 300) && text(o.feedback)),
        fail('неверные варианты ответа'),
      );
      demand(
        step.options.some((o) => o.id === step.answer),
        fail('ответ отсутствует среди вариантов'),
      );
    } else if (step.kind === 'squares') {
      demand(
        Array.isArray(step.targets) &&
          step.targets.length > 0 &&
          step.targets.length <= 16 &&
          step.targets.every((s) => squarePattern.test(s)) &&
          new Set(step.targets).size === step.targets.length,
        fail('неверные целевые поля'),
      );
    } else if (step.kind === 'move') {
      demand(
        !step.goal || ['mate', 'capture', 'promotion', 'castle'].includes(step.goal),
        fail('неизвестная цель задания'),
      );
      demand(
        Array.isArray(step.lines) && step.lines.length > 0 && step.lines.length <= 8,
        fail('нужны решения'),
      );
      const replies = new Map<string, string>();
      for (const [i, a] of step.lines.entries())
        for (const [j, b] of step.lines.entries())
          if (i !== j && Array.isArray(a) && Array.isArray(b))
            demand(
              !(a.length <= b.length && a.every((m, n) => b[n] === m)),
              fail('решения повторяются или одно заканчивается внутри другого'),
            );
      for (const line of step.lines) {
        demand(
          Array.isArray(line) && line.length > 0 && line.length <= 15 && line.length % 2 === 1,
          fail('линия должна завершаться ходом ученика'),
        );
        const game = new ChessGame(step.fen);
        for (let i = 0; i < line.length; i++) {
          const move = applyUci(game, line[i]);
          demand(move, fail(`${step.id}: нелегальный ход ${line[i]}`));
          if (i % 2 === 1) {
            const prefix = line.slice(0, i).join(' ');
            demand(
              !replies.has(prefix) || replies.get(prefix) === line[i],
              fail('неоднозначный автоматический ответ'),
            );
            replies.set(prefix, line[i]);
          }
          if (i === line.length - 1)
            demand(
              !step.goal ||
                (step.goal === 'mate'
                  ? game.outcome()?.reason === 'Мат'
                  : step.goal === 'capture'
                    ? !!move.captured
                    : step.goal === 'promotion'
                      ? !!move.promotion
                      : move.flags.includes('k') || move.flags.includes('q')),
              fail(`${step.id}: решение не достигает цели`),
            );
        }
      }
      demand(
        !step.wrong ||
          (Array.isArray(step.wrong) &&
            step.wrong.length <= 10 &&
            step.wrong.every((v) => movePattern.test(v.move) && text(v.text))),
        fail('неверный разбор ошибки'),
      );
    } else throw new Error(fail('неизвестный тип шага'));
  }
  demand(exercises > 0, fail('нужна хотя бы одна самостоятельная задача'));
  return lesson;
}
export function validateCurriculum(input: unknown): LessonDefinition[] {
  demand(
    Array.isArray(input) && input.length > 0 && input.length <= 2000,
    'Неверный каталог уроков.',
  );
  const lessons = input.map(validateLesson);
  const byId = new Map(lessons.map((l) => [l.id, l]));
  demand(byId.size === lessons.length, 'Повторяющиеся ID уроков.');
  const done = new Set<string>();
  const visiting = new Set<string>();
  function visit(id: string) {
    demand(byId.has(id), `Неизвестная зависимость ${id}`);
    if (done.has(id)) return;
    demand(!visiting.has(id), `Цикл зависимостей ${id}`);
    visiting.add(id);
    byId.get(id)!.prerequisites.forEach(visit);
    visiting.delete(id);
    done.add(id);
  }
  lessons.forEach((l) => visit(l.id));
  return lessons;
}
