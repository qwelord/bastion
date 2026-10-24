import { ChessGame, type Promotion } from '../chess/rules';
import { StockfishClient, type AnalysisLine } from './stockfish';
import type { EngineKind } from './strength';
export type ReviewRow = {
  ply: number;
  san: string;
  side: 'w' | 'b';
  label: string;
  loss: number;
  before: number;
  after: number;
  best: string;
  depth: number;
  lines: AnalysisLine[];
};
export function classifyMove(best: number, played: number, same: boolean, forced = false) {
  const loss = Math.max(0, best - played);
  if (forced) return 'Вынужденный';
  if (same) return 'Лучший';
  if (best >= 200 && played < 50 && loss >= 180) return 'Упущенный шанс';
  return loss >= 250
    ? 'Грубая ошибка'
    : loss >= 120
      ? 'Ошибка'
      : loss >= 60
        ? 'Неточность'
        : loss >= 25
          ? 'Хороший'
          : 'Отличный';
}
export function sanLine(fen: string, pv: string[]) {
  const game = new ChessGame(fen);
  const result: string[] = [];
  for (const move of pv) {
    const played = game.play({
      from: move.slice(0, 2),
      to: move.slice(2, 4),
      ...(move[4] ? { promotion: move[4] as Promotion } : {}),
    });
    if (!played) break;
    result.push(played.san);
  }
  return result.join(' ');
}
const cache = new Map<string, AnalysisLine[]>();
export class ReviewService {
  constructor(private engine = new StockfishClient()) {}
  cancel() {
    this.engine.cancel();
  }
  dispose() {
    this.engine.dispose();
  }
  async evaluate(
    game: ChessGame,
    kind: EngineKind,
    budget: number,
    onDepth?: (depth: number) => void,
  ) {
    const outcome = game.outcome();
    if (outcome)
      return {
        score:
          outcome.result === '1/2-1/2'
            ? 0
            : outcome.result === (game.turn() === 'w' ? '1-0' : '0-1')
              ? 100000
              : -100000,
        depth: 0,
        lines: [] as AnalysisLine[],
      };
    const key = `${kind}:${budget}:${game.enginePosition()}`;
    const hit = cache.get(key);
    if (hit) return { score: hit[0].score, depth: hit[0].depth, lines: hit };
    const reply = await this.engine.search({
      position: game.enginePosition(),
      kind,
      strength: { mode: 'skill', value: 20 },
      legalCount: game.moves().length,
      moveTime: budget,
      analysis: { lines: 3 },
      onDepth,
    });
    if (!reply.lines.length)
      throw new Error('Движок не успел оценить позицию. Выберите более глубокий разбор.');
    cache.set(key, reply.lines);
    if (cache.size > 600) cache.delete(cache.keys().next().value!);
    return { score: reply.lines[0].score, depth: reply.lines[0].depth, lines: reply.lines };
  }
  async review(
    pgn: string,
    kind: EngineKind,
    budget: number,
    onRow: (row: ReviewRow, total: number) => void,
    signal: AbortSignal,
  ) {
    if (signal.aborted) throw new DOMException('Отменено', 'AbortError');
    const original = ChessGame.fromPgn(pgn);
    const moves = original.history();
    if (!moves.length) throw new Error('Сначала сыграйте несколько ходов.');
    const game = new ChessGame(moves[0].before);
    let previous = await this.evaluate(game, kind, budget);
    const rows: ReviewRow[] = [];
    for (let i = 0; i < moves.length; i++) {
      if (signal.aborted) throw new DOMException('Отменено', 'AbortError');
      const move = moves[i];
      const uci = move.from + move.to + (move.promotion ?? '');
      const forced = game.moves().length === 1;
      const best = previous.lines[0]?.move ?? '';
      const bestSan = best ? sanLine(game.fen(), [best]) : '';
      game.play({
        from: move.from,
        to: move.to,
        promotion: move.promotion as Promotion | undefined,
      });
      const after = await this.evaluate(game, kind, budget);
      if (signal.aborted) throw new DOMException('Отменено', 'AbortError');
      const row: ReviewRow = {
        ply: i + 1,
        san: move.san,
        side: move.color,
        label: classifyMove(previous.score, -after.score, best === uci, forced),
        loss: Math.max(0, previous.score + after.score),
        before: previous.score,
        after: -after.score,
        best: bestSan,
        depth: Math.min(previous.depth, after.depth || previous.depth),
        lines: previous.lines,
      };
      rows.push(row);
      onRow(row, moves.length);
      previous = after;
    }
    return rows;
  }
}
