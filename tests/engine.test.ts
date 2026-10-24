import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createInterface } from 'node:readline';
import { StockfishClient } from '../src/engine/stockfish.ts';
import { normalizeStrength, strengthCommands, trainingMove } from '../src/engine/strength.ts';
import { ChessGame } from '../src/chess/rules.ts';
const require = createRequire(import.meta.url);
const stockfish = require('stockfish');
function nodeEngine(kind: 'lite' | 'full', lines: string[] = []) {
  const path = stockfish.findEngine(kind === 'lite' ? 'lite-single' : 'single');
  const child = spawn(process.execPath, [path], { stdio: ['pipe', 'pipe', 'pipe'] });
  const port = {
    onmessage: null as ((event: { data: unknown }) => void) | null,
    onerror: null as ((event: { message?: string }) => void) | null,
    postMessage(command: string) {
      child.stdin.write(command + '\n');
    },
    terminate() {
      child.kill();
      reader.close();
    },
  };
  const reader = createInterface({ input: child.stdout });
  reader.on('line', (line) => {
    lines.push(line);
    port.onmessage?.({ data: line });
  });
  child.on('error', (error) => port.onerror?.({ message: error.message }));
  child.stdin.on('error', () => {});
  return port;
}
test('numeric controls clamp values and use distinct native UCI modes', () => {
  assert.deepEqual(normalizeStrength({ mode: 'elo', value: 200 }), { mode: 'elo', value: 1320 });
  assert.deepEqual(normalizeStrength({ mode: 'skill', value: 25 }), { mode: 'skill', value: 20 });
  assert.ok(
    strengthCommands({ mode: 'elo', value: 1800 }, 20).includes(
      'setoption name UCI_LimitStrength value true',
    ),
  );
  assert.ok(
    strengthCommands({ mode: 'skill', value: 20 }, 20).includes(
      'setoption name UCI_LimitStrength value false',
    ),
  );
  assert.ok(
    strengthCommands({ mode: 'training', value: 200 }, 20).includes(
      'setoption name MultiPV value 20',
    ),
  );
});
test('training policy only selects analyzed candidates and can choose a weaker move', () => {
  const candidates = [
    { move: 'e2e4', score: 30, depth: 2 },
    { move: 'd2d4', score: 10, depth: 2 },
    { move: 'f2f3', score: -700, depth: 2 },
  ];
  assert.equal(
    trainingMove(candidates, 200, () => 0.3),
    'f2f3',
  );
  assert.equal(
    trainingMove(candidates, 1300, () => 0.99),
    'e2e4',
  );
  assert.equal(trainingMove([], 200), null);
});
test(
  'real Stockfish Lite initializes, accepts numeric Elo and returns a legal reply',
  { timeout: 25000 },
  async (t) => {
    const lines: string[] = [];
    const client = new StockfishClient((kind) => nodeEngine(kind, lines));
    t.after(() => client.dispose());
    const name = await client.load('lite');
    assert.match(name, /Stockfish 19/);
    assert.ok(lines.some((line) => /option name UCI_Elo.*min 1320 max 3190/.test(line)));
    const game = new ChessGame();
    game.play('e4');
    const reply = await client.search({
      kind: 'lite',
      position: game.enginePosition(),
      strength: { mode: 'elo', value: 1320 },
      legalCount: game.moves().length,
      moveTime: 80,
    });
    assert.ok(game.play({ from: reply.move.slice(0, 2), to: reply.move.slice(2, 4) }));
    assert.ok(reply.depth > 0);
  },
);
test(
  'real Stockfish training mode evaluates candidates for strength 200',
  { timeout: 25000 },
  async (t) => {
    const client = new StockfishClient((kind) => nodeEngine(kind));
    t.after(() => client.dispose());
    const game = new ChessGame();
    const reply = await client.search({
      kind: 'lite',
      position: game.enginePosition(),
      strength: { mode: 'training', value: 200 },
      legalCount: 20,
    });
    assert.equal(reply.training, true);
    assert.ok(game.play({ from: reply.move.slice(0, 2), to: reply.move.slice(2, 4) }));
  },
);
test('real full-network Stockfish starts and makes a legal move', { timeout: 40000 }, async (t) => {
  const client = new StockfishClient((kind) => nodeEngine(kind));
  t.after(() => client.dispose());
  const game = new ChessGame();
  const reply = await client.search({
    kind: 'full',
    position: game.enginePosition(),
    strength: { mode: 'skill', value: 20 },
    legalCount: 20,
    moveTime: 60,
  });
  assert.ok(game.play({ from: reply.move.slice(0, 2), to: reply.move.slice(2, 4) }));
  assert.match(reply.name, /Stockfish 19/);
});
test('cancelled startup cannot leak an old bestmove into a new request', async () => {
  const ports: Array<ReturnType<typeof fake>> = [];
  function fake() {
    return {
      onmessage: null as ((event: { data: unknown }) => void) | null,
      onerror: null as ((event: { message?: string }) => void) | null,
      postMessage(command: string) {
        if (command === 'uci') queueMicrotask(() => this.onmessage?.({ data: 'uciok' }));
        if (command === 'isready') queueMicrotask(() => this.onmessage?.({ data: 'readyok' }));
      },
      terminate() {},
    };
  }
  const client = new StockfishClient(() => {
    const port = fake();
    ports.push(port);
    return port;
  });
  const request = {
    kind: 'lite' as const,
    position: new ChessGame().enginePosition(),
    strength: { mode: 'skill' as const, value: 5 },
    legalCount: 20,
  };
  await client.load('lite');
  const stale = ports[0].onmessage!;
  const pending = client.search(request);
  const rejected = assert.rejects(pending, (error) => (error as Error).name === 'AbortError');
  client.cancel();
  await rejected;
  const fresh = client.search(request);
  for (let i = 0; i < 6; i++) await Promise.resolve();
  stale({ data: 'bestmove a2a3' });
  ports.at(-1)!.onmessage?.({ data: 'bestmove e2e4' });
  assert.equal((await fresh).move, 'e2e4');
  client.dispose();
});

test(
  'real Stockfish analysis returns three legal scored variations at bounded depth',
  { timeout: 25000 },
  async (t) => {
    const client = new StockfishClient((kind) => nodeEngine(kind));
    t.after(() => client.dispose());
    const game = new ChessGame();
    const reply = await client.search({
      kind: 'lite',
      position: game.enginePosition(),
      strength: { mode: 'skill', value: 20 },
      legalCount: 20,
      analysis: { lines: 3, depth: 6 },
    });
    assert.equal(reply.lines.length, 3);
    assert.ok(reply.depth >= 6);
    for (const line of reply.lines) {
      assert.ok(Number.isFinite(line.score));
      assert.ok(line.depth >= 5);
      const variation = new ChessGame();
      for (const move of line.pv)
        assert.ok(
          variation.play({
            from: move.slice(0, 2),
            to: move.slice(2, 4),
            ...(move[4] ? { promotion: move[4] as 'q' } : {}),
          }),
        );
    }
  },
);
