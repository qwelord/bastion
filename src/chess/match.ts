import { validTime } from './time';
import { ChessGame, type Color, type MoveInput, type Outcome } from './rules';
import { normalizeStrength, type EngineKind, type Strength } from '../engine/strength';

export type MatchConfig = {
  opponent: 'stockfish' | 'local';
  engine: EngineKind;
  color: Color | 'random';
  strength: Strength;
  minutes: number;
  increment: number;
};
export const defaultConfig: MatchConfig = {
  opponent: 'stockfish',
  engine: 'lite',
  color: 'w',
  strength: { mode: 'training', value: 800 },
  minutes: 10,
  increment: 0,
};
export type SavedMatch = {
  version: 1;
  pgn: string;
  config: MatchConfig;
  human: Color;
  remaining: Record<Color, number>;
  undoClocks: Record<Color, number>[];
  outcome: Outcome | null;
  started: boolean;
};
export class Match {
  game: ChessGame;
  config: MatchConfig;
  human: Color;
  started = false;
  paused = true;
  remaining: Record<Color, number>;
  private anchor: number | null = null;
  private undoClocks: Record<Color, number>[] = [];
  constructor(config = defaultConfig, game = new ChessGame()) {
    if (
      !config ||
      !['stockfish', 'local'].includes(config.opponent) ||
      !['lite', 'full'].includes(config.engine) ||
      !['w', 'b', 'random'].includes(config.color) ||
      !validTime(config.minutes, config.increment) ||

      !config.strength
    )
      throw new Error('Некорректные параметры партии.');
    this.config = { ...config, strength: normalizeStrength(config.strength) };
    this.human = config.color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : config.color;
    this.game = game;
    this.remaining = { w: config.minutes * 60_000, b: config.minutes * 60_000 };
  }
  clocks(now: number) {
    const clocks = { ...this.remaining };
    if (this.anchor !== null && !this.paused && !this.game.outcome())
      clocks[this.game.turn()] = Math.max(
        0,
        clocks[this.game.turn()] - Math.max(0, now - this.anchor),
      );
    return clocks;
  }
  start(now: number) {
    this.started = true;
    this.resume(now);
  }
  resume(now: number) {
    if (this.game.outcome()) return;
    this.paused = false;
    this.anchor = now;
  }
  pause(now: number) {
    this.remaining = this.clocks(now);
    this.paused = true;
    this.anchor = null;
  }
  checkTimeout(now: number) {
    if (this.paused || this.game.outcome() || !this.config.minutes) return false;
    const clocks = this.clocks(now);
    const loser = this.game.turn();
    if (clocks[loser] > 0) return false;
    this.remaining = clocks;
    const winner = loser === 'w' ? 'b' : 'w';
    this.game.finish(
      this.game.canMate(winner)
        ? { result: winner === 'w' ? '1-0' : '0-1', reason: 'Время истекло' }
        : { result: '1/2-1/2', reason: 'Время истекло, но мат невозможен' },
    );
    this.paused = true;
    this.anchor = null;
    return true;
  }
  play(move: MoveInput | string, now: number) {
    if (!this.started || this.paused || this.checkTimeout(now)) return null;
    const before = this.clocks(now);
    const side = this.game.turn();
    const result = this.game.play(move);
    if (!result) return null;
    this.undoClocks.push(before);
    this.remaining = { ...before, [side]: before[side] + this.config.increment * 1000 };
    this.anchor = now;
    return result;
  }
  canInteract() {
    return (
      this.started &&
      !this.paused &&
      !this.game.outcome() &&
      (this.config.opponent === 'local' || this.game.turn() === this.human)
    );
  }
  resign(now: number) {
    if (!this.started || this.game.outcome()) return;
    this.pause(now);
    const loser = this.config.opponent === 'stockfish' ? this.human : this.game.turn();
    this.game.finish({ result: loser === 'w' ? '0-1' : '1-0', reason: 'Сдача партии' });
  }
  claimDraw(now: number) {
    if (!this.canInteract() || !this.game.claimableDraw()) return false;
    this.pause(now);
    return this.game.claimDraw();
  }
  agreeDraw(now: number) {
    if (!this.started || this.config.opponent !== 'local' || this.game.outcome()) return;
    this.pause(now);
    this.game.finish({ result: '1/2-1/2', reason: 'Ничья по соглашению' });
  }
  undo(now: number) {
    if (!this.game.history().length) return;
    const last = this.game.history().at(-1)!;
    const count = this.config.opponent === 'stockfish' && last.color !== this.human ? 2 : 1;
    for (let i = 0; i < count; i++) {
      if (!this.game.undo()) break;
      this.remaining = this.undoClocks.pop() ?? this.remaining;
    }
    this.anchor = now;
  }
  save(now: number): SavedMatch {
    return {
      version: 1,
      pgn: this.game.pgn(),
      config: this.config,
      human: this.human,
      remaining: this.clocks(now),
      undoClocks: this.undoClocks,
      outcome: this.game.outcome(),
      started: this.started,
    };
  }
  static restore(raw: unknown) {
    const s = raw as SavedMatch;
    if (
      !s ||
      s.version !== 1 ||
      !s.config ||
      !['stockfish', 'local'].includes(s.config.opponent) ||
      !['lite', 'full'].includes(s.config.engine) ||
      !['w', 'b', 'random'].includes(s.config.color) ||
      !s.config.strength ||
      !['elo', 'skill', 'training'].includes(s.config.strength.mode) ||
      !validTime(s.config.minutes, s.config.increment) ||

      !['w', 'b'].includes(s.human) ||
      !s.remaining ||
      !Number.isFinite(s.remaining.w) ||
      !Number.isFinite(s.remaining.b) ||
      s.remaining.w < 0 ||
      s.remaining.b < 0
    )
      throw new Error('Некорректное сохранение');
    const match = new Match(s.config, ChessGame.fromPgn(s.pgn));
    match.human = s.human;
    match.remaining = s.remaining;
    match.started = !!s.started;
    match.undoClocks = Array.isArray(s.undoClocks)
      ? s.undoClocks.filter(
          (c) => Number.isFinite(c?.w) && Number.isFinite(c?.b) && c.w >= 0 && c.b >= 0,
        )
      : [];
    if (
      s.outcome &&
      ['1-0', '0-1', '1/2-1/2'].includes(s.outcome.result) &&
      typeof s.outcome.reason === 'string'
    )
      match.game.restoreOutcome(s.outcome);
    return match;
  }
}

