import {
  Chess,
  DEFAULT_POSITION,
  type Color,
  type Move,
  type PieceSymbol,
  type Square,
} from 'chess.js';
import type { Position } from '../data/position';

export type Promotion = 'q' | 'r' | 'b' | 'n';
export type Outcome = { result: '1-0' | '0-1' | '1/2-1/2'; reason: string };
export type MoveInput = { from: string; to: string; promotion?: Promotion };
const key = (fen: string) => fen.split(' ').slice(0, 4).join(' ');

export function validatePosition(fen: string): Chess {
  const chess = new Chess(fen.trim());
  const opposite: Color = chess.turn() === 'w' ? 'b' : 'w';
  const king = chess.findPiece({ type: 'k', color: opposite })[0];
  if (chess.isAttacked(king, chess.turn()))
    throw new Error('Король стороны, которая только что ходила, не может оставаться под шахом.');
  const [, turn, rights, ep] = chess.fen({ forceEnpassantSquare: true }).split(' ');
  for (const [flag, kingSquare, rookSquare, color] of [
    ['K', 'e1', 'h1', 'w'],
    ['Q', 'e1', 'a1', 'w'],
    ['k', 'e8', 'h8', 'b'],
    ['q', 'e8', 'a8', 'b'],
  ]) {
    if (
      rights.includes(flag) &&
      (chess.get(kingSquare as Square)?.type !== 'k' ||
        chess.get(kingSquare as Square)?.color !== color ||
        chess.get(rookSquare as Square)?.type !== 'r' ||
        chess.get(rookSquare as Square)?.color !== color)
    )
      throw new Error('Право рокировки не соответствует расположению короля и ладьи.');
  }
  if (ep !== '-') {
    const pawn = chess.get((ep[0] + (turn === 'w' ? '5' : '4')) as Square);
    if (chess.get(ep as Square) || pawn?.type !== 'p' || pawn.color !== opposite)
      throw new Error('Некорректное поле взятия на проходе.');
  }
  return chess;
}

export class ChessGame {
  private chess: Chess;
  private forced: Outcome | null = null;
  constructor(fen = DEFAULT_POSITION) {
    this.chess = validatePosition(fen);
  }
  static fromPgn(pgn: string) {
    if (pgn.length > 200_000) throw new Error('PGN слишком большой. Загрузите одну партию.');
    const game = new ChessGame();
    const parsed = new Chess();
    parsed.loadPgn(pgn, { strict: false });
    const history = parsed.history({ verbose: true });
    validatePosition(history[0]?.before ?? parsed.fen());
    validatePosition(parsed.fen());
    game.chess = parsed;
    const result = parsed.getHeaders().Result;
    if (!game.outcome() && ['1-0', '0-1', '1/2-1/2'].includes(result))
      game.forced = { result: result as Outcome['result'], reason: 'Результат из PGN' };
    return game;
  }
  fen() {
    return this.chess.fen();
  }
  turn() {
    return this.chess.turn();
  }
  history() {
    return this.chess.history({ verbose: true });
  }
  position(ply = this.history().length): Position {
    const history = this.history();
    const fen =
      ply === history.length
        ? this.fen()
        : ply === 0
          ? (history[0]?.before ?? this.fen())
          : history[ply - 1].after;
    return Object.fromEntries(
      new Chess(fen)
        .board()
        .flat()
        .filter(Boolean)
        .map((piece) => [piece!.square, piece!.color + piece!.type]),
    );
  }
  moves(square?: string): Move[] {
    if (this.outcome()) return [];
    return this.chess.moves({ verbose: true, ...(square ? { square: square as Square } : {}) });
  }
  needsPromotion(from: string, to: string) {
    return this.moves(from).some((move) => move.to === to && !!move.promotion);
  }
  play(move: MoveInput | string): Move | null {
    if (this.outcome()) return null;
    try {
      return this.chess.move(move);
    } catch {
      return null;
    }
  }
  undo() {
    this.forced = null;
    this.chess.removeHeader('Result');
    return this.chess.undo();
  }
  inCheck() {
    return this.chess.isCheck();
  }
  checkedKing() {
    return this.inCheck() ? this.chess.findPiece({ color: this.turn(), type: 'k' })[0] : undefined;
  }
  repetitionCount() {
    const history = this.history();
    return [history[0]?.before ?? this.fen(), ...history.map((m) => m.after)].filter(
      (fen) => key(fen) === key(this.fen()),
    ).length;
  }
  claimableDraw(): string | null {
    if (this.outcome()) return null;
    if (this.repetitionCount() >= 3) return 'Троекратное повторение';
    if (Number(this.fen().split(' ')[4]) >= 100) return 'Правило 50 ходов';
    return null;
  }
  outcome(): Outcome | null {
    if (this.forced) return this.forced;
    if (this.chess.isCheckmate())
      return { result: this.turn() === 'w' ? '0-1' : '1-0', reason: 'Мат' };
    if (this.chess.isStalemate()) return { result: '1/2-1/2', reason: 'Пат' };
    if (this.chess.isInsufficientMaterial())
      return { result: '1/2-1/2', reason: 'Недостаточно материала для мата' };
    if (Number(this.fen().split(' ')[4]) >= 150)
      return { result: '1/2-1/2', reason: 'Правило 75 ходов' };
    if (this.repetitionCount() >= 5) return { result: '1/2-1/2', reason: 'Пятикратное повторение' };
    return null;
  }
  finish(outcome: Outcome) {
    this.forced = outcome;
  }
  restoreOutcome(outcome: Outcome | null) {
    this.forced = outcome;
  }
  claimDraw() {
    const reason = this.claimableDraw();
    if (reason) this.finish({ result: '1/2-1/2', reason });
    return !!reason;
  }
  canMate(color: Color) {
    const all = this.chess.board().flat().filter(Boolean);
    const own = all.filter((p) => p!.color === color && p!.type !== 'k');
    if (!own.length) return false;
    if (
      own.some((p) => ['p', 'r', 'q'].includes(p!.type)) ||
      (own.length > 1 && own.some((p) => p!.type === 'n'))
    )
      return true;
    if (all.filter((p) => p!.type !== 'k').every((p) => p!.type === 'b')) {
      const colors = new Set(
        all
          .filter((p) => p!.type === 'b')
          .map((p) => (p!.square.charCodeAt(0) + Number(p!.square[1])) % 2),
      );
      return colors.size > 1;
    }
    return all.some((p) => p!.color !== color && p!.type !== 'k');
  }
  pgn() {
    this.chess.setHeader('Result', this.outcome()?.result ?? '*');
    return this.chess.pgn({ maxWidth: 80 });
  }
  setPlayers(white: string, black: string) {
    this.chess.setHeader('White', white);
    this.chess.setHeader('Black', black);
    this.chess.setHeader('Event', 'Bastion');
  }
  enginePosition() {
    const history = this.history();
    const start = history[0]?.before ?? this.fen();
    return `position fen ${start}${history.length ? ' moves ' + history.map((m) => m.lan).join(' ') : ''}`;
  }
}
export type { Color, Square, PieceSymbol };
