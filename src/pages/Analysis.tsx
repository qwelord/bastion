import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Repeat2, Square, Play } from 'lucide-react';
import { Board } from '../components/Board';
import { MoveList } from '../components/MoveList';
import { readGames, selectedGameKey } from '../data/games';
import { ChessGame } from '../chess/rules';
import { ReviewService, sanLine, type ReviewRow } from '../engine/review';
import type { EngineKind } from '../engine/strength';
import type { Settings } from '../state';
const evaluation = (score: number) =>
  Math.abs(score) > 90000
    ? score > 0
      ? 'Белые ставят мат'
      : 'Чёрные ставят мат'
    : `${score > 0 ? '+' : ''}${(score / 100).toFixed(2)}`;
export function Analysis({ settings }: { settings: Settings }) {
  const [games] = useState(readGames);
  const [id, setId] = useState(() => {
    try {
      return localStorage.getItem(selectedGameKey) || games[0]?.id || '';
    } catch {
      return games[0]?.id || '';
    }
  });
  const stored = games.find((g) => g.id === id) ?? games[0];
  const [ply, setPly] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [error, setError] = useState('');
  const [kind, setKind] = useState<EngineKind>('lite');
  const [budget, setBudget] = useState(700);
  const [service] = useState(() => new ReviewService());
  const abort = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      abort.current?.abort();
      service.dispose();
    },
    [service],
  );
  function stop() {
    abort.current?.abort();
    service.cancel();
    setBusy(false);
    setStopped(true);
  }
  async function review() {
    if (!stored) return;
    stop();
    const token = new AbortController();
    abort.current = token;
    setRows([]);
    setError('');
    setBusy(true);
    setStopped(false);
    try {
      await service.review(
        stored.match.pgn,
        kind,
        budget,
        (row) => {
          if (!token.signal.aborted) setRows((r) => [...r, row]);
        },
        token.signal,
      );
    } catch (e) {
      if (!token.signal.aborted) setError((e as Error).message);
    } finally {
      if (abort.current === token) setBusy(false);
    }
  }
  if (!stored)
    return (
      <>
        <div className="page-intro">
          <div>
            <h1>Разбор партии</h1>
            <p>Бесплатный анализ Stockfish на вашем устройстве.</p>
          </div>
        </div>
        <div className="empty-state surface">
          <h2>Сначала нужна партия</h2>
          <p>Сыграйте со Stockfish или другом, затем откройте разбор.</p>
          <a className="primary" href="#play">
            Начать партию <ArrowRight size={16} />
          </a>
        </div>
      </>
    );
  const game = ChessGame.fromPgn(stored.match.pgn);
  const history = game.history();
  const current = rows.find((r) => r.ply === ply);
  const whiteScore = current ? current.after * (current.side === 'w' ? 1 : -1) : 0;
  const critical = rows.filter((r) =>
    ['Ошибка', 'Грубая ошибка', 'Упущенный шанс'].includes(r.label),
  );
  return (
    <>
      <div className="page-intro">
        <div>
          <h1>Разбор партии</h1>
          <p>Stockfish 19. Бесплатно, без лимита партий.</p>
        </div>
        <a className="text-button" href="#library">
          Библиотека <ArrowRight size={16} />
        </a>
      </div>
      <div className="play-layout review-layout">
        <section className="board-column">
          <div className="review-board-caption">
            <span>{ply ? `После ${history[ply - 1].san}` : 'Начальная позиция'}</span>
            <strong>{current ? evaluation(whiteScore) : 'Оценка за белых'}</strong>
          </div>
          <Board
            settings={settings}
            position={game.position(ply)}
            flipped={flipped}
            highlight={ply ? [history[ply - 1].from, history[ply - 1].to] : []}
          />
          <div className="board-toolbar">
            <span>
              {ply} / {history.length}
            </span>
            <div>
              <button
                className="icon-button"
                aria-label="Перевернуть доску"
                onClick={() => setFlipped(!flipped)}
              >
                <Repeat2 size={18} />
              </button>
              <button
                className="icon-button"
                aria-label="Предыдущий ход"
                disabled={!ply}
                onClick={() => setPly(ply - 1)}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                className="icon-button"
                aria-label="Следующий ход"
                disabled={ply === history.length}
                onClick={() => setPly(ply + 1)}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          {rows.length > 0 && (
            <div className="evaluation-chart" aria-label="График оценки за белых">
              <svg
                viewBox="0 0 600 110"
                role="img"
                aria-label="Выше середины — преимущество белых, ниже — чёрных"
              >
                <line x1="0" y1="55" x2="600" y2="55" stroke="currentColor" opacity=".25" />
                <polyline
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  points={rows
                    .map(
                      (r) =>
                        `${(r.ply / history.length) * 600},${55 - (Math.max(-1000, Math.min(1000, r.after * (r.side === 'w' ? 1 : -1))) / 1000) * 50}`,
                    )
                    .join(' ')}
                />
              </svg>
              <div className="chart-steps">
                {rows.map((r) => (
                  <button
                    key={r.ply}
                    aria-label={`Ход ${r.ply}: ${r.san}, ${r.label}`}
                    aria-pressed={ply === r.ply}
                    title={`${r.san}: ${r.label}`}
                    onClick={() => setPly(r.ply)}
                  >
                    {r.san}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
        <aside className="game-panel surface">
          <label className="field-label" htmlFor="review-game">
            Партия
          </label>
          <select
            id="review-game"
            value={stored.id}
            disabled={busy}
            onChange={(e) => {
              stop();
              setId(e.target.value);
              setPly(0);
              setRows([]);
              setError('');
            }}
          >
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title} · {new Date(g.created).toLocaleDateString('ru')}
              </option>
            ))}
          </select>
          <div className="review-options">
            <label>
              Движок
              <select
                aria-label="Движок анализа"
                disabled={busy}
                value={kind}
                onChange={(e) => setKind(e.target.value as EngineKind)}
              >
                <option value="lite">Lite · 1,8 МБ</option>
                <option value="full">Full · 99 МБ</option>
              </select>
            </label>
            <label>
              На позицию
              <select
                aria-label="Время анализа позиции"
                disabled={busy}
                value={budget}
                onChange={(e) => setBudget(+e.target.value)}
              >
                <option value={300}>Быстро · 0,3 с</option>
                <option value={700}>Обычно · 0,7 с</option>
                <option value={2000}>Глубже · 2 с</option>
              </select>
            </label>
          </div>
          <button
            className={busy ? 'secondary full' : 'primary full'}
            onClick={busy ? stop : review}
          >
            {busy ? <Square size={15} /> : <Play size={15} />}{' '}
            {busy
              ? 'Остановить разбор'
              : rows.length
                ? 'Пересчитать разбор'
                : 'Разобрать всю партию'}
          </button>
          <div className="review-progress" role="status">
            <span>
              {busy
                ? rows.length
                  ? `Разобрано ${rows.length} из ${history.length} полуходов`
                  : 'Загружаем движок и оцениваем позицию…'
                : rows.length === history.length
                  ? 'Разбор завершён'
                  : rows.length
                    ? 'Разбор остановлен. Готовые оценки доступны.'
                    : stopped
                      ? 'Расчёт остановлен.'
                      : 'Расчёт начнётся по нажатию кнопки.'}
            </span>
            <progress max={history.length || 1} value={rows.length} />
          </div>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {current && (
            <section className="move-verdict">
              <h2>
                {current.san} <span>{current.label}</span>
              </h2>
              <p>
                {current.best ? `Сильнейшее продолжение: ${current.best}.` : ''} Глубина{' '}
                {current.depth}.
              </p>
              {Math.abs(current.before) > 90000 || Math.abs(current.after) > 90000 ? (
                <p>В позиции есть форсированный мат. Сравните варианты движка.</p>
              ) : (
                current.loss >= 25 && (
                  <p>Потеря оценки: {Math.min(999, current.loss / 100).toFixed(2)} пешки.</p>
                )
              )}
              <details>
                <summary>Варианты Stockfish</summary>
                {current.lines.map((line, i) => (
                  <p key={i}>
                    <strong>
                      {line.mate !== undefined ? `Мат ${line.mate}` : (line.score / 100).toFixed(2)}
                    </strong>{' '}
                    {sanLine(history[ply - 1].before, line.pv)}
                  </p>
                ))}
                <small>Варианты из позиции перед ходом. Оценки за ходившую сторону.</small>
              </details>
            </section>
          )}
          <MoveList
            empty="В партии пока нет ходов."
            moves={history}
            ply={ply}
            onNavigate={setPly}
          />
          {critical.length > 0 && (
            <details open>
              <summary>Ключевые моменты · {critical.length}</summary>
              <div className="critical-moves">
                {critical.map((r) => (
                  <button key={r.ply} onClick={() => setPly(r.ply)}>
                    {Math.ceil(r.ply / 2)}
                    {r.side === 'w' ? '.' : '…'} {r.san}
                    <span>{r.label}</span>
                  </button>
                ))}
              </div>
            </details>
          )}
          {rows.length === history.length && (
            <div className="review-summary">
              {(['w', 'b'] as const).map((side) => (
                <div key={side}>
                  <strong>{side === 'w' ? 'Белые' : 'Чёрные'}</strong>
                  <span>
                    Лучших: {rows.filter((r) => r.side === side && r.label === 'Лучший').length}
                  </span>
                  <span>Ошибок: {critical.filter((r) => r.side === side).length}</span>
                </div>
              ))}
            </div>
          )}
          <p className="quiet-note">
            Метки основаны на потере оценки при выбранной глубине. Это объяснимая шкала Bastion; при
            более глубоком расчёте оценка может измениться.
          </p>
        </aside>
      </div>
    </>
  );
}
