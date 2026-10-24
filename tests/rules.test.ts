import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ChessGame } from '../src/chess/rules.ts';
import { Match, defaultConfig } from '../src/chess/match.ts';

function sequence(game: ChessGame, moves: string[]) {
  for (const move of moves) assert.ok(game.play(move), move);
}
test('initial position allows twenty moves and rejects illegal moves without changing position', () => {
  const game = new ChessGame();
  const fen = game.fen();
  assert.equal(game.moves().length, 20);
  assert.equal(game.play({ from: 'e2', to: 'e5' }), null);
  assert.equal(game.play({ from: 'e7', to: 'e5' }), null);
  assert.equal(game.fen(), fen);
});
test('a pinned piece cannot expose its king', () => {
  const game = new ChessGame('k3r3/8/8/8/8/8/4R3/4K3 w - - 0 1');
  assert.equal(game.play({ from: 'e2', to: 'd2' }), null);
  assert.ok(game.play({ from: 'e2', to: 'e8' }));
});
test('kings cannot step next to each other', () => {
  const game = new ChessGame('8/8/8/8/8/4k3/8/4K3 w - - 0 1');
  assert.equal(game.play({ from: 'e1', to: 'e2' }), null);
});
test('both castlings relocate the rook and revoke rights', () => {
  const game = new ChessGame('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  assert.ok(game.play('O-O'));
  assert.equal(game.position().f1, 'wr');
  assert.equal(game.position().h1, undefined);
  assert.ok(game.play('O-O-O'));
  assert.equal(game.position().d8, 'br');
  assert.equal(game.fen().split(' ')[2], '-');
  game.undo();
  assert.equal(game.position().a8, 'br');
});
test('castling is forbidden through attack and after a rook has moved back', () => {
  const attacked = new ChessGame('k4r2/8/8/8/8/8/8/4K2R w K - 0 1');
  assert.equal(attacked.play('O-O'), null);
  const game = new ChessGame('4k3/8/8/8/8/8/8/4K2R w K - 0 1');
  sequence(game, ['Rh2', 'Kf8', 'Rh1', 'Ke8']);
  assert.equal(game.play('O-O'), null);
});
test('en passant removes the correct pawn and expires after another move', () => {
  const game = new ChessGame();
  sequence(game, ['e4', 'a6', 'e5', 'd5']);
  assert.ok(game.moves('e5').some((m) => m.to === 'd6'));
  const capture = game.play('exd6');
  assert.ok(capture?.isEnPassant());
  assert.equal(game.position().d5, undefined);
  assert.equal(game.position().d6, 'wp');
  const expired = new ChessGame();
  sequence(expired, ['e4', 'a6', 'e5', 'd5', 'Nf3', 'a5']);
  assert.equal(expired.play({ from: 'e5', to: 'd6' }), null);
});
test('en passant cannot expose a horizontal check', () => {
  const game = new ChessGame('7k/8/8/r4pPK/8/8/8/8 w - f6 0 1');
  assert.equal(game.play({ from: 'g5', to: 'f6' }), null);
});
for (const piece of ['q', 'r', 'b', 'n'] as const)
  test('promotion supports ' + piece, () => {
    const game = new ChessGame('7k/P7/8/8/8/8/8/7K w - - 0 1');
    assert.ok(game.needsPromotion('a7', 'a8'));
    assert.ok(game.play({ from: 'a7', to: 'a8', promotion: piece }));
    assert.equal(game.position().a8, 'w' + piece);
  });
test('checkmate ends the game and undo reopens it', () => {
  const game = new ChessGame();
  sequence(game, ['f3', 'e5', 'g4', 'Qh4#']);
  assert.deepEqual(game.outcome(), { result: '0-1', reason: 'Мат' });
  assert.equal(game.moves().length, 0);
  game.undo();
  assert.equal(game.outcome(), null);
});
test('stalemate and insufficient material are draws', () => {
  assert.equal(new ChessGame('k7/8/1QK5/8/8/8/8/8 b - - 0 1').outcome()?.reason, 'Пат');
  assert.equal(new ChessGame('7k/8/8/8/8/8/8/7K w - - 0 1').outcome()?.result, '1/2-1/2');
});
test('threefold repetition is claimable and fivefold is automatic', () => {
  const game = new ChessGame();
  const cycle = ['Nf3', 'Nf6', 'Ng1', 'Ng8'];
  sequence(game, [...cycle, ...cycle]);
  assert.equal(game.repetitionCount(), 3);
  assert.equal(game.outcome(), null);
  assert.ok(game.claimableDraw());
  sequence(game, [...cycle, ...cycle]);
  assert.equal(game.repetitionCount(), 5);
  assert.equal(game.outcome()?.reason, 'Пятикратное повторение');
});
test('a claimed repetition is recorded in the PGN', () => {
  const game = new ChessGame();
  const cycle = ['Nf3', 'Nf6', 'Ng1', 'Ng8'];
  sequence(game, [...cycle, ...cycle]);
  assert.ok(game.claimDraw());
  assert.equal(ChessGame.fromPgn(game.pgn()).outcome()?.result, '1/2-1/2');
});
test('50-move claim and 75-move automatic draw are distinct', () => {
  const game = new ChessGame('7k/8/8/8/8/8/8/KR6 w - - 99 1');
  game.play('Rb2');
  assert.equal(game.claimableDraw(), 'Правило 50 ходов');
  assert.equal(game.outcome(), null);
  const automatic = new ChessGame('7k/8/8/8/8/8/8/KR6 w - - 149 1');
  automatic.play('Rb2');
  assert.equal(automatic.outcome()?.reason, 'Правило 75 ходов');
});
test('FEN and PGN round trips preserve custom setup, black to move and castling', () => {
  const game = new ChessGame('r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 17');
  sequence(game, ['O-O-O', 'O-O']);
  const restored = ChessGame.fromPgn(game.pgn());
  assert.equal(restored.fen(), game.fen());
  assert.deepEqual(
    restored.history().map((m) => m.san),
    game.history().map((m) => m.san),
  );
  assert.equal(new ChessGame(game.fen()).fen(), game.fen());
});
test('engine command preserves repetition history instead of sending only the final FEN', () => {
  const game = new ChessGame();
  sequence(game, ['e4', 'e5']);
  assert.match(game.enginePosition(), /moves e2e4 e7e5$/);
});
test('invalid and oversized input is rejected', () => {
  for (const fen of [
    '<script>alert(1)</script>',
    '8/8/8/8/8/8/4k3/4K3 w - - 0 1',
    '4k3/8/8/8/8/8/8/4K3 w K - 0 1',
    '4k3/8/8/8/8/8/8/4K3 w - d6 0 1',
  ])
    assert.throws(() => new ChessGame(fen), fen);
  assert.throws(() => ChessGame.fromPgn('x'.repeat(200001)));
  assert.throws(() => ChessGame.fromPgn('1. e4 e5 2. not-a-move'));
});
test('clocks debit elapsed wall time and add increment after a completed move', () => {
  const match = new Match({ ...defaultConfig, opponent: 'local', minutes: 1, increment: 2 });
  match.start(1000);
  assert.ok(match.play('e4', 2000));
  assert.deepEqual(match.clocks(3500), { w: 61000, b: 58500 });
  match.pause(3500);
  assert.deepEqual(match.clocks(9000), { w: 61000, b: 58500 });
  match.resume(9000);
  assert.deepEqual(match.clocks(10000), { w: 61000, b: 57500 });
});
test('a move cannot be accepted after a flag falls', () => {
  const match = new Match({ ...defaultConfig, minutes: 1 });
  match.start(0);
  assert.equal(match.play('e4', 60001), null);
  assert.equal(match.game.outcome()?.result, '0-1');
});
test('timeout is a draw if the other side has only a king', () => {
  const match = new Match(
    { ...defaultConfig, minutes: 1 },
    new ChessGame('6rk/8/8/8/8/8/8/K7 b - - 0 1'),
  );
  match.start(0);
  match.checkTimeout(60000);
  assert.equal(match.game.outcome()?.result, '1/2-1/2');
});
test('unlimited games never lose on time', () => {
  const match = new Match({ ...defaultConfig, minutes: 0 });
  match.start(0);
  assert.equal(match.checkTimeout(999999), false);
  assert.ok(match.play('e4', 999999));
});
test('undo against the engine retracts a pair of moves with their clock snapshots', () => {
  const match = new Match({ ...defaultConfig, minutes: 1 });
  match.start(0);
  match.play('e4', 1000);
  match.play('e5', 2000);
  match.undo(2500);
  assert.equal(match.game.history().length, 0);
  assert.equal(match.game.turn(), 'w');
  assert.deepEqual(match.remaining, { w: 59000, b: 60000 });
});
test('saved games restore paused, without charging time spent away', () => {
  const match = new Match({ ...defaultConfig, opponent: 'local', minutes: 1 });
  match.start(0);
  match.play('e4', 1000);
  const restored = Match.restore(JSON.parse(JSON.stringify(match.save(2000))));
  assert.equal(restored.paused, true);
  assert.equal(restored.game.fen(), match.game.fen());
  assert.deepEqual(restored.clocks(100000), { w: 59000, b: 59000 });
});
test('corrupt saves do not become playable sessions', () => {
  assert.throws(() => Match.restore({ version: 1 }));
  const match = new Match();
  const save = match.save(0);
  assert.throws(() =>
    Match.restore({ ...save, config: { ...save.config, engine: 'https://example.com/evil.js' } }),
  );
});
