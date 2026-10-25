import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lessons } from '../src/learning/catalog.ts';
import { StepSession } from '../src/learning/session.ts';
test('every authored exercise is solvable by the learner session including automatic replies', () => {
  for (const lesson of lessons)
    for (const step of lesson.steps) {
      if (step.kind === 'move')
        for (const line of step.lines) {
          const session = new StepSession(step);
          for (let i = 0; i < line.length; i += 2)
            assert.ok(session.move(line[i]), `${lesson.id}/${step.id}/${line[i]}`);
          assert.equal(session.state.complete, true, `${lesson.id}/${step.id}`);
        }
      else {
        const session = new StepSession(step);
        if (step.kind === 'explain') session.read();
        if (step.kind === 'choice') session.choose(step.answer);
        if (step.kind === 'squares') {
          step.targets.forEach((s) => session.toggleSquare(s));
          session.checkSquares();
        }
        assert.equal(session.state.complete, true, `${lesson.id}/${step.id}`);
      }
    }
});
test('the published lesson set exercises all four supported authoring formats', () => {
  assert.equal(lessons.length, 162);
  assert.deepEqual(
    new Set(lessons.flatMap((l) => l.steps.map((s) => s.kind))),
    new Set(['explain', 'choice', 'squares', 'move']),
  );
  assert.ok(
    lessons.some((l) =>
      l.steps.some((s) => s.kind === 'move' && s.lines.some((line) => line.length > 1)),
    ),
  );
});
