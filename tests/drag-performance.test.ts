import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DragMotion } from '../src/components/dragMotion.ts';
import { ChessGame } from '../src/chess/rules.ts';
test('high-rate pointer events are coalesced into one display frame using latest position', () => {
  let queued: FrameRequestCallback | undefined;
  let requested = 0;
  const positions: { x: number; y: number }[] = [];
  const motion = new DragMotion(
    (p) => positions.push(p),
    (callback) => {
      requested++;
      queued = callback;
      return requested;
    },
    () => {},
  );
  for (let n = 0; n < 1000; n++) motion.move(n, n * 2);
  assert.equal(requested, 1);
  assert.equal(positions.length, 0);
  queued!(0);
  assert.deepEqual(positions, [{ x: 999, y: 1998 }]);
  motion.move(1001, 2002);
  assert.equal(requested, 2);
  queued!(16);
  assert.deepEqual(positions.at(-1), { x: 1001, y: 2002 });
});
test('drop or pointer cancellation discards pending movement instead of moving a stale piece', () => {
  let queued: FrameRequestCallback | undefined;
  let cancelled = 0;
  let drawn = 0;
  const motion = new DragMotion(
    () => drawn++,
    (callback) => {
      queued = callback;
      return 7;
    },
    (id) => {
      assert.equal(id, 7);
      cancelled++;
    },
  );
  motion.move(10, 20);
  motion.cancel();
  queued!(0);
  assert.equal(drawn, 0);
  assert.equal(cancelled, 1);
  motion.flush();
  assert.equal(drawn, 0);
});
test('history and result caches invalidate on moves undo finish and PGN result restore', () => {
  const game = new ChessGame();
  assert.equal(game.outcome(), null);
  const history = game.history();
  history.push({} as never);
  assert.equal(game.history().length, 0);
  for (const move of ['f3', 'e5', 'g4', 'Qh4#']) {
    assert.ok(game.play(move));
    game.history();
    game.outcome();
  }
  assert.equal(game.history().length, 4);
  assert.equal(game.outcome()?.reason, 'Мат');
  game.undo();
  assert.equal(game.history().length, 3);
  assert.equal(game.outcome(), null);
  game.finish({ result: '1-0', reason: 'Сдача партии' });
  assert.equal(game.outcome()?.result, '1-0');
  game.restoreOutcome(null);
  assert.equal(game.outcome(), null);
  const restored = ChessGame.fromPgn('[Result "1-0"]\n\n1. e4 e5 1-0');
  assert.equal(restored.outcome()?.result, '1-0');
  restored.undo();
  assert.equal(restored.outcome(), null);
});
