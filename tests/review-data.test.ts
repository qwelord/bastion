import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Match, defaultConfig } from '../src/chess/match.ts';
import { validTime, timeCategory } from '../src/chess/time.ts';
import { decodeGames, readGames, writeGames, archiveGame } from '../src/data/games.ts';
import { classifyMove, ReviewService, sanLine } from '../src/engine/review.ts';
import { StockfishClient } from '../src/engine/stockfish.ts';
import { ChessGame } from '../src/chess/rules.ts';
const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  },
});
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { dispatchEvent: () => true },
});
function saved() {
  const m = new Match({ ...defaultConfig, opponent: 'local' });
  m.start(0);
  m.play('e4', 100);
  return m.save(100);
}
test('custom clock boundaries preserve quarter minutes and increments after restore', () => {
  for (const [m, i] of [
    [0.25, 0],
    [3, 2],
    [180, 60],
    [0, 0],
  ]) {
    assert.ok(validTime(m, i));
    const game = new Match({ ...defaultConfig, minutes: m, increment: i });
    assert.equal(Match.restore(game.save(0)).config.minutes, m);
  }
  for (const [m, i] of [
    [0, 1],
    [-1, 0],
    [181, 0],
    [1, 61],
    [1.1, 0],
    [NaN, 0],
    [1, Infinity],
  ])
    assert.equal(validTime(m, i), false);
  assert.equal(timeCategory(1, 0), 'Пуля');
  assert.equal(timeCategory(3, 2), 'Блиц');
  assert.equal(timeCategory(15, 10), 'Рапид');
  assert.equal(timeCategory(90, 30), 'Классика');
});
test('library updates preserve notes and favorite without duplicating an ongoing game', () => {
  storage.clear();
  archiveGame('game-1', saved());
  const games = readGames();
  assert.equal(games.length, 1);
  games[0].note = 'Разобрать окончание';
  games[0].favorite = true;
  writeGames(games);
  archiveGame('game-1', saved());
  assert.equal(readGames().length, 1);
  assert.equal(readGames()[0].note, 'Разобрать окончание');
  assert.equal(readGames()[0].favorite, true);
});
test('corrupt library cannot be silently overwritten by autosave', () => {
  storage.set('bastion.games.v1', '{"broken":true}');
  assert.throws(() => archiveGame('new', saved()));
  assert.equal(storage.get('bastion.games.v1'), '{"broken":true}');
  storage.clear();
});
test('backup validation rejects duplicate IDs and invalid chess state before restore', () => {
  const item = {
    id: 'game-1',
    created: 1,
    updated: 2,
    title: '<script>plain text</script>',
    note: 'x'.repeat(5000),
    favorite: true,
    match: saved(),
  };
  const clean = decodeGames(JSON.stringify([item]), true);
  assert.equal(clean[0].note.length, 4000);
  assert.equal(clean[0].title, item.title);
  assert.throws(() => decodeGames(JSON.stringify([item, item]), true));
  assert.throws(() => decodeGames(JSON.stringify([{ ...item, match: { version: 9 } }]), true));
  assert.throws(() => decodeGames('[]'.repeat(4_000_001)));
});
test('review distinguishes loss of a winning chance, blunders and forced moves', () => {
  assert.equal(classifyMove(400, 0, false), 'Упущенный шанс');
  assert.equal(classifyMove(0, -300, false), 'Грубая ошибка');
  assert.equal(classifyMove(0, -140, false), 'Ошибка');
  assert.equal(classifyMove(0, -70, false), 'Неточность');
  assert.equal(classifyMove(0, -30, false), 'Хороший');
  assert.equal(classifyMove(0, -10, false), 'Отличный');
  assert.equal(classifyMove(0, -300, true), 'Лучший');
  assert.equal(classifyMove(0, -300, false, true), 'Вынужденный');
});
test('PV notation validates moves and stops at invalid continuations', () => {
  assert.equal(sanLine(new ChessGame().fen(), ['e2e4', 'e7e5', 'g1f3', 'a1a8']), 'e4 e5 Nf3');
});
test('review compares both sides in mover perspective and reuses cached positions', async () => {
  let searches = 0;
  class FakeEngine extends StockfishClient {
    override async search(request: Parameters<StockfishClient['search']>[0]) {
      searches++;
      const black = request.position.includes(' moves e2e4') && !request.position.includes('e7e5');
      return {
        move: black ? 'e7e5' : 'e2e4',
        name: 'test',
        depth: 12,
        training: false,
        lines: [
          {
            move: black ? 'e7e5' : 'e2e4',
            score: black ? -40 : 40,
            depth: 12,
            pv: [black ? 'e7e5' : 'e2e4'],
          },
        ],
      };
    }
  }
  const game = new ChessGame();
  game.play('e4');
  game.play('e5');
  const service = new ReviewService(new FakeEngine());
  const controller = new AbortController();
  const rows = await service.review(game.pgn(), 'lite', 321, () => {}, controller.signal);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].side, 'w');
  assert.equal(rows[1].side, 'b');
  assert.equal(rows[0].after, 40);
  assert.equal(rows[1].after, -40);
  assert.equal(rows[0].label, 'Лучший');
  assert.equal(rows[1].label, 'Лучший');
  await service.review(game.pgn(), 'lite', 321, () => {}, controller.signal);
  assert.equal(searches, 3);
  service.dispose();
});
test('aborted review never publishes a later position', async () => {
  class FakeEngine extends StockfishClient {
    override async search() {
      return {
        move: 'e2e4',
        name: 'test',
        depth: 1,
        training: false,
        lines: [{ move: 'e2e4', score: 0, depth: 1, pv: ['e2e4'] }],
      };
    }
  }
  const game = new ChessGame();
  game.play('e4');
  const service = new ReviewService(new FakeEngine());
  const controller = new AbortController();
  controller.abort();
  let published = 0;
  await assert.rejects(
    service.review(game.pgn(), 'lite', 322, () => published++, controller.signal),
    { name: 'AbortError' },
  );
  assert.equal(published, 0);
  service.dispose();
});
