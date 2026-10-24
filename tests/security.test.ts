import { test } from 'node:test';
import assert from 'node:assert/strict';
import { securityHeaders } from '../config/security.mjs';
import { StockfishClient } from '../src/engine/stockfish.ts';
import { ChessGame } from '../src/chess/rules.ts';
test('production headers restrict scripts, workers, frames and network to the application', () => {
  const headers = securityHeaders();
  const csp = headers['Content-Security-Policy'];
  assert.match(csp, /script-src 'self' 'wasm-unsafe-eval';/);
  assert.ok(!csp.includes("'unsafe-eval'"));
  assert.match(csp, /worker-src 'self'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /connect-src 'self';/);
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
});
test('engine command injection cannot start a worker', async () => {
  let created = false;
  const client = new StockfishClient(() => {
    created = true;
    throw new Error('unexpected');
  });
  await assert.rejects(
    client.search({
      kind: 'lite',
      position: 'position fen x\nquit',
      strength: { mode: 'elo', value: 1500 },
      legalCount: 20,
    }),
  );
  assert.equal(created, false);
});
test('saved PGN headers remain plain text and cannot change chess logic', () => {
  const input = '[Event "<img src=x onerror=alert(1)>"]\n\n1. e4 e5 *';
  const game = ChessGame.fromPgn(input);
  assert.equal(game.history().length, 2);
  assert.match(game.pgn(), /<img/);
  assert.equal(game.turn(), 'w');
});
