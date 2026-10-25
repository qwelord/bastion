import { ChessGame } from '../chess/rules';
import { applyUci, type LessonStep, type MoveStep } from './schema';
export type StepSnapshot = {
  trail: string[];
  choice: string;
  squares: string[];
  attempts: number;
  mistakes: number;
  hints: number;
  revealed: boolean;
  complete: boolean;
};
const fresh = (): StepSnapshot => ({
  trail: [],
  choice: '',
  squares: [],
  attempts: 0,
  mistakes: 0,
  hints: 0,
  revealed: false,
  complete: false,
});
const equalSquares = (a: string[], b: string[]) =>
  a.length === b.length && a.every((s) => b.includes(s));
const prefixOf = (prefix: string[], line: string[]) => prefix.every((m, i) => line[i] === m);
export class StepSession {
  game: ChessGame;
  state = fresh();
  status: 'idle' | 'wrong' | 'correct' = 'idle';
  message = '';
  constructor(
    readonly step: LessonStep,
    snapshot?: unknown,
  ) {
    this.game = new ChessGame(step.fen);
    if (snapshot) this.restore(snapshot);
  }
  private isMateAlternative(step: MoveStep, trail: string[], game: ChessGame) {
    return (
      step.goal === 'mate' &&
      trail.length === 1 &&
      step.lines.every((l) => l.length === 1) &&
      game.outcome()?.reason === 'Мат'
    );
  }
  private restore(raw: unknown) {
    try {
      const state = raw as StepSnapshot;
      if (
        !state ||
        !Array.isArray(state.trail) ||
        state.trail.length > 15 ||
        !Array.isArray(state.squares) ||
        state.squares.length > 16 ||
        !state.squares.every((s) => /^[a-h][1-8]$/.test(s)) ||
        new Set(state.squares).size !== state.squares.length ||
        typeof state.choice !== 'string' ||
        typeof state.complete !== 'boolean' ||
        typeof state.revealed !== 'boolean'
      )
        return;
      if (
        ![state.attempts, state.mistakes, state.hints].every(
          (v) => Number.isInteger(v) && v >= 0 && v <= 10000,
        ) ||
        state.mistakes > state.attempts
      )
        return;
      const game = new ChessGame(this.step.fen);
      for (const move of state.trail) if (typeof move !== 'string' || !applyUci(game, move)) return;
      if (this.step.kind !== 'move' && state.trail.length) return;
      if (this.step.kind === 'move') {
        const candidate = this.step.lines.find((line) => prefixOf(state.trail, line));
        const alternative = this.isMateAlternative(this.step, state.trail, game);
        if (!candidate && !alternative) return;
        const complete = alternative || candidate!.length === state.trail.length;
        if (state.complete !== complete || (!complete && state.trail.length % 2 !== 0)) return;
      } else if (
        this.step.kind === 'choice' &&
        state.complete !== (state.choice === this.step.answer)
      )
        return;
      else if (
        this.step.kind === 'squares' &&
        state.complete &&
        !equalSquares(state.squares, this.step.targets)
      )
        return;
      const maxHints = this.step.kind === 'explain' ? 0 : this.step.hints.length;
      this.state = {
        ...state,
        trail: [...state.trail],
        squares: [...state.squares],
        hints: Math.min(maxHints, state.hints),
      };
      this.game = game;
      this.status = state.complete ? 'correct' : 'idle';
      if (state.complete && this.step.kind !== 'explain') this.message = this.step.success;
    } catch {
      /* Invalid cursor starts the step again, without affecting other lessons. */
    }
  }
  snapshot(): StepSnapshot {
    return { ...this.state, trail: [...this.state.trail], squares: [...this.state.squares] };
  }
  private wrong(message: string) {
    this.state.mistakes++;
    this.status = 'wrong';
    this.message = message;
    return false;
  }
  move(uci: string) {
    if (this.step.kind !== 'move' || this.state.complete) return false;
    this.state.attempts++;
    const trial = new ChessGame(this.game.fen());
    const move = applyUci(trial, uci);
    if (!move)
      return this.wrong(
        'Этот ход нарушает правила. Проверьте путь фигуры и безопасность своего короля.',
      );
    const trail = [...this.state.trail, uci];
    const candidate = this.step.lines.find((line) => prefixOf(trail, line));
    const alternative = this.isMateAlternative(this.step, trail, trial);
    if (!candidate && !alternative)
      return this.wrong(
        this.step.wrong?.find((w) => w.move === uci)?.text ??
          'Ход легален, но не решает поставленную задачу. Вернитесь к цели и сравните варианты.',
      );
    applyUci(this.game, uci);
    this.state.trail.push(uci);
    if (alternative || candidate!.length === this.state.trail.length) {
      this.state.complete = true;
      this.status = 'correct';
      this.message = this.step.success;
    } else {
      const reply = applyUci(this.game, candidate![this.state.trail.length]);
      this.state.trail.push(candidate![this.state.trail.length]);
      this.status = 'idle';
      this.message = `Верно. Ответ в учебном варианте: ${reply!.san}. Продолжите за свою сторону.`;
    }
    return true;
  }
  choose(id: string) {
    if (this.step.kind !== 'choice' || this.state.complete) return;
    const option = this.step.options.find((o) => o.id === id);
    if (!option) return;
    this.state.attempts++;
    this.state.choice = id;
    if (id !== this.step.answer) {
      this.wrong(option.feedback);
      return;
    }
    this.state.complete = true;
    this.status = 'correct';
    this.message = this.step.success;
  }
  toggleSquare(square: string) {
    if (this.step.kind !== 'squares' || this.state.complete || !/^[a-h][1-8]$/.test(square)) return;
    this.state.squares = this.state.squares.includes(square)
      ? this.state.squares.filter((s) => s !== square)
      : [...this.state.squares, square].slice(0, 16);
    this.status = 'idle';
    this.message = '';
  }
  checkSquares() {
    if (this.step.kind !== 'squares' || this.state.complete) return;
    this.state.attempts++;
    if (!equalSquares(this.state.squares, this.step.targets)) {
      this.wrong(
        'Проверьте все отмеченные поля. Нужен точный набор: без пропусков и лишних клеток.',
      );
      return;
    }
    this.state.complete = true;
    this.status = 'correct';
    this.message = this.step.success;
  }
  hint() {
    if (this.step.kind !== 'explain' && !this.state.complete)
      this.state.hints = Math.min(this.step.hints.length, this.state.hints + 1);
  }
  read() {
    if (this.step.kind === 'explain') this.state.complete = true;
  }
  reveal() {
    if (this.step.kind === 'explain' || this.state.complete) return;
    this.state.revealed = true;
    this.state.hints = this.step.hints.length;
    if (this.step.kind === 'move') {
      this.game = new ChessGame(this.step.fen);
      this.state.trail = [];
      for (const move of this.step.lines[0]) {
        applyUci(this.game, move);
        this.state.trail.push(move);
      }
    }
    if (this.step.kind === 'choice') this.state.choice = this.step.answer;
    if (this.step.kind === 'squares') this.state.squares = [...this.step.targets];
    this.state.complete = true;
    this.status = 'correct';
    this.message = this.step.success;
  }
  retry() {
    this.state = fresh();
    this.game = new ChessGame(this.step.fen);
    this.status = 'idle';
    this.message = '';
  }
}
