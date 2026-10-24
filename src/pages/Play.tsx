import { MatchClock } from '../components/MatchClock';
import { openReview } from '../data/games';
import { initialPosition } from '../data/position';
import { useRef } from 'react';
import { moveSound, unlockSound } from '../chess/sound';
import { TimeControl } from '../components/TimeControl';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Repeat2,
  Swords,
  SlidersHorizontal,
  Pause,
  Play as PlayIcon,
  Undo2,
  Flag,
  Plus,
} from 'lucide-react';
import { Board } from '../components/Board';
import { PromotionDialog } from '../components/GameDialogs';
import { StrengthControl } from '../components/StrengthControl';
import { MoveList } from '../components/MoveList';
import { useMatch } from '../chess/useMatch';
import { normalizeStrength, strengthLabel } from '../engine/strength';
import type { MatchConfig } from '../chess/match';
import type { Settings } from '../state';

export function Play({ settings }: { settings: Settings }) {
  const api = useMatch();
  const { match } = api;
  const game = match.game;
  const history = game.history();
  const outcome = game.outcome();
  const heard = useRef(game.fen());
  useEffect(() => {
    if (heard.current !== game.fen() && settings.sound) {
      const last = game.history().at(-1);
      if (last) moveSound(!!last.captured, game.inCheck(), !!game.outcome(), settings.volume);
    }
    heard.current = game.fen();
  }, [api.version, settings.sound, settings.volume, game]);
  const [setup, setSetup] = useState(!match.started);
  const [draft, setDraft] = useState<MatchConfig>(match.config);
  const [flipped, setFlipped] = useState(match.human === 'b');
  const [selected, setSelected] = useState<string>();
  const [viewPly, setViewPly] = useState<number | null>(null);
  const [editStrength, setEditStrength] = useState(false);
  useEffect(() => {
    setSelected(undefined);
    setViewPly(null);
  }, [api.version]);
  const ply = Math.min(viewPly ?? history.length, history.length);
  const interactive = !setup && viewPly === null && match.canInteract() && !api.promotion;
  const selectedMoves = selected ? game.moves(selected) : [];
  const movable: string[] = interactive ? [...new Set(game.moves().map((m) => m.from))] : [];
  function square(s: string) {
    if (!interactive) return;
    if (settings.sound) unlockSound();
    if (selected === s) {
      setSelected(undefined);
      return;
    }
    if (selected && selectedMoves.some((m) => m.to === s)) {
      api.play(selected, s);
      setSelected(undefined);
      return;
    }
    setSelected(movable.includes(s) ? s : undefined);
  }
  function navigate(n: number) {
    setViewPly(n === history.length ? null : n);
    setSelected(undefined);
  }

  const top = flipped ? 'w' : 'b';
  const bottom = flipped ? 'b' : 'w';
  const displayConfig = setup ? draft : match.config;
  const displayHuman = setup && draft.color !== 'random' ? draft.color : match.human;
  const name = (side: 'w' | 'b') =>
    displayConfig.opponent === 'stockfish'
      ? side === displayHuman
        ? 'Вы'
        : 'Stockfish 19'
      : side === 'w'
        ? 'Белые'
        : 'Чёрные';
  const subtitle = (side: 'w' | 'b') =>
    displayConfig.opponent === 'stockfish' && side !== displayHuman
      ? `${displayConfig.engine === 'lite' ? 'Lite' : 'Full'} · ${strengthLabel(displayConfig.strength)}`
      : side === 'w'
        ? 'Белые фигуры'
        : 'Чёрные фигуры';
  const status = outcome
    ? `${outcome.result === '1/2-1/2' ? 'Ничья' : outcome.result === '1-0' ? 'Победа белых' : 'Победа чёрных'} · ${outcome.reason}`
    : api.enginePhase === 'loading'
      ? 'Загрузка Stockfish…'
      : match.paused
        ? 'Партия на паузе'
        : api.enginePhase === 'thinking'
          ? `Stockfish думает${api.depth ? ' · глубина ' + api.depth : ''}`
          : (game.turn() === 'w' ? 'Ход белых' : 'Ход чёрных') + (game.inCheck() ? ' · Шах' : '');
  return (
    <>
      <div className="page-intro">
        <div>
          <h1>
            {setup
              ? 'Играть'
              : match.config.opponent === 'stockfish'
                ? 'Партия со Stockfish'
                : 'Партия на одной доске'}
          </h1>
          <p>
            {setup
              ? 'Выберите соперника и начните партию.'
              : 'Перетаскивайте фигуры или выбирайте поле назначения нажатием.'}
          </p>
        </div>
      </div>
      <div className="play-layout">
        <section className="board-column" aria-label="Игровое поле">
          <div className="player-row">
            <div className="player-identity">
              <span className="opponent-icon">
                <Swords size={20} />
              </span>
              <span>
                {name(top)}
                <small>{subtitle(top)}</small>
              </span>
            </div>
            <MatchClock match={match} side={top} setupMinutes={setup ? draft.minutes : undefined} />
          </div>
          <div
            className={'board-stage' + (!settings.coordinates ? ' without-coordinates' : '')}
            aria-busy={api.enginePhase === 'loading'}
          >
            <Board
              settings={settings}
              position={setup ? initialPosition : game.position(ply)}
              flipped={flipped}
              selected={selected}
              onSquare={interactive ? square : undefined}
              onMove={
                interactive
                  ? (from, to) => {
                      if (settings.sound) unlockSound();
                      api.play(from, to);
                      setSelected(undefined);
                    }
                  : undefined
              }
              movableSquares={movable}
              onDragStart={setSelected}
              legalTargets={selectedMoves.map((m) => m.to)}
              checkedSquare={!setup && viewPly === null ? game.checkedKing() : undefined}
              highlight={!setup && ply ? [history[ply - 1].from, history[ply - 1].to] : []}
            />
            {api.enginePhase === 'loading' && (
              <div className="engine-loading" role="status">
                <span className="loading-ring" />
                <strong>Загружаем Stockfish</strong>
                <span>
                  {match.config.engine === 'full'
                    ? 'Полная версия · 99 МБ'
                    : 'Компактная версия · 1,8 МБ'}
                </span>
                <button className="text-button" onClick={api.pause}>
                  Отменить загрузку
                </button>
              </div>
            )}
          </div>
          <div className="player-row">
            <div className="player-identity">
              <span className="player-avatar">{bottom === 'w' ? 'Б' : 'Ч'}</span>
              <span>
                {name(bottom)}
                <small>{subtitle(bottom)}</small>
              </span>
            </div>
            <MatchClock
              match={match}
              side={bottom}
              setupMinutes={setup ? draft.minutes : undefined}
              yours
            />
          </div>
          <div className="board-toolbar">
            <span>
              {viewPly === null ? 'Текущая позиция' : `Просмотр: ${ply} / ${history.length}`}
            </span>
            <div>
              <button
                className="icon-button"
                aria-label="Перевернуть доску"
                onClick={() => setFlipped(!flipped)}
              >
                <Repeat2 size={17} />
              </button>
              <button
                className="icon-button"
                aria-label="К началу партии"
                disabled={ply === 0}
                onClick={() => navigate(0)}
              >
                <ChevronsLeft size={18} />
              </button>
              <button
                className="icon-button"
                aria-label="Предыдущий ход"
                disabled={ply === 0}
                onClick={() => navigate(ply - 1)}
              >
                <ChevronLeft size={19} />
              </button>
              <button
                className="icon-button"
                aria-label="Следующий ход"
                disabled={ply === history.length}
                onClick={() => navigate(ply + 1)}
              >
                <ChevronRight size={19} />
              </button>
              <button
                className="icon-button"
                aria-label="К текущей позиции"
                disabled={viewPly === null}
                onClick={() => navigate(history.length)}
              >
                <ChevronsRight size={18} />
              </button>
            </div>
          </div>
          {viewPly !== null && (
            <button className="text-button" onClick={() => navigate(history.length)}>
              Вернуться к игре <ArrowRight size={15} />
            </button>
          )}
        </section>
        <aside className="game-panel surface">
          {setup ? (
            <>
              <div className="panel-heading">
                <h2>Новая партия</h2>
                <SlidersHorizontal size={19} />
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="opponent">
                  Соперник
                </label>
                <select
                  id="opponent"
                  value={draft.opponent}
                  onChange={(e) =>
                    setDraft({ ...draft, opponent: e.target.value as MatchConfig['opponent'] })
                  }
                >
                  <option value="stockfish">Stockfish 19</option>
                  <option value="local">Два игрока на одной доске</option>
                </select>
              </div>
              {draft.opponent === 'stockfish' && (
                <>
                  <div className="field-group">
                    <label className="field-label" htmlFor="engine-kind">
                      Версия движка
                    </label>
                    <select
                      id="engine-kind"
                      value={draft.engine}
                      onChange={(e) =>
                        setDraft({ ...draft, engine: e.target.value as MatchConfig['engine'] })
                      }
                    >
                      <option value="lite">Stockfish 19 Lite · 1,8 МБ</option>
                      <option value="full">Stockfish 19 Full · 99 МБ</option>
                    </select>
                    <p className="quiet-note">
                      {draft.engine === 'full'
                        ? 'Полная нейросеть. Первая загрузка может занять больше времени.'
                        : 'Компактная нейросеть. Быстро загружается и работает локально.'}
                    </p>
                  </div>
                  <div className="field-group">
                    <span className="field-label">Ваша сторона</span>
                    <div className="segmented">
                      {(
                        [
                          ['w', 'Белые'],
                          ['random', 'Случайно'],
                          ['b', 'Чёрные'],
                        ] as const
                      ).map(([id, label]) => (
                        <button
                          key={id}
                          aria-pressed={draft.color === id}
                          onClick={() => {
                            setDraft({ ...draft, color: id });
                            if (id !== 'random') setFlipped(id === 'b');
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <StrengthControl
                    value={draft.strength}
                    onChange={(strength) => setDraft({ ...draft, strength })}
                  />
                </>
              )}
              <TimeControl
                minutes={draft.minutes}
                increment={draft.increment}
                onChange={(minutes, increment) => setDraft({ ...draft, minutes, increment })}
              />
              <button
                className="primary full"
                onClick={() => {
                  if (settings.sound) unlockSound();
                  const config = { ...draft, strength: normalizeStrength(draft.strength) };
                  const side = api.start(config);
                  setSetup(false);
                  setViewPly(null);
                  setFlipped(side === 'b');
                  window.scrollTo({
                    top: 0,
                    behavior:
                      settings.motion &&
                      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
                        ? 'smooth'
                        : 'auto',
                  });
                }}
              >
                Начать партию <ArrowRight size={17} />
              </button>
              {match.started && (
                <button
                  className="text-button full"
                  onClick={() => {
                    setSetup(false);
                    setFlipped(match.human === 'b');
                  }}
                >
                  Вернуться к текущей партии
                </button>
              )}
              <div className="panel-foot">
                <span className="tiny-dot" />
                Локально. Без регистрации.
              </div>
            </>
          ) : (
            <>
              <div className="panel-heading">
                <h2>Партия</h2>
                <button
                  className="icon-button"
                  aria-label="Новая партия"
                  onClick={() => {
                    api.pause();
                    setDraft(match.config);
                    setEditStrength(false);
                    setSetup(true);
                  }}
                >
                  <Plus size={20} />
                </button>
              </div>
              <p className={'game-status ' + (outcome ? 'game-finished' : '')} role="status">
                {status}
              </p>
              {api.error && (
                <p className="form-error" role="alert">
                  {api.error}
                </p>
              )}
              {api.storageConflict && (
                <button className="secondary full" onClick={() => location.reload()}>
                  Открыть актуальную партию
                </button>
              )}
              {!outcome && api.enginePhase !== 'loading' && (
                <button
                  className="secondary full pause-control"
                  onClick={() => (match.paused ? api.resume() : api.pause())}
                >
                  {match.paused ? <PlayIcon size={16} /> : <Pause size={16} />}{' '}
                  {match.paused ? 'Продолжить партию' : 'Пауза'}
                </button>
              )}
              <MoveList
                moves={history}
                ply={ply}
                onNavigate={navigate}
                empty={
                  api.enginePhase === 'loading'
                    ? 'Движок загружается…'
                    : api.enginePhase === 'thinking'
                      ? 'Stockfish делает первый ход…'
                      : match.paused
                        ? 'Нажмите «Продолжить партию».'
                        : 'Сделайте первый ход.'
                }
              />
              {!outcome && game.claimableDraw() && match.canInteract() && (
                <button className="secondary full" onClick={api.claimDraw}>
                  Заявить ничью · {game.claimableDraw()}
                </button>
              )}
              {api.drawMessage && (
                <p className="quiet-note" role="status">
                  {api.drawMessage}
                </p>
              )}
              {!outcome && match.config.opponent === 'stockfish' && (
                <button
                  className="text-button full"
                  disabled={!match.canInteract() || api.drawBusy}
                  onClick={api.offerDraw}
                >
                  {api.drawBusy ? 'Оценка предложения…' : 'Предложить ничью'}
                </button>
              )}
              <div className="match-actions">
                <button
                  className="secondary"
                  disabled={!history.length || api.enginePhase === 'loading'}
                  onClick={api.undo}
                >
                  <Undo2 size={15} />
                  Вернуть ход
                </button>

                {!outcome && (
                  <button className="secondary" onClick={api.resign}>
                    <Flag size={15} />
                    Сдаться
                  </button>
                )}
                {!outcome && match.config.opponent === 'local' && (
                  <button className="secondary" onClick={api.agreeDraw}>
                    Ничья
                  </button>
                )}
              </div>
              {match.config.opponent === 'stockfish' && !outcome && (
                <div className="in-game-strength">
                  <button
                    className="text-button"
                    onClick={() => {
                      api.pause();
                      setDraft(match.config);
                      setEditStrength(!editStrength);
                    }}
                  >
                    <SlidersHorizontal size={15} />
                    Изменить силу
                  </button>
                  {editStrength && (
                    <>
                      <StrengthControl
                        value={draft.strength}
                        onChange={(strength) => setDraft({ ...draft, strength })}
                      />
                      <button
                        className="primary full"
                        onClick={() => {
                          api.updateStrength(draft.strength);
                          setEditStrength(false);
                        }}
                      >
                        Применить и продолжить
                      </button>
                    </>
                  )}
                </div>
              )}
              {history.length > 0 && (
                <button
                  className="secondary full"
                  onClick={() => {
                    api.pause();
                    openReview(api.gameId);
                  }}
                >
                  Разобрать партию бесплатно
                </button>
              )}
              {outcome && (
                <button
                  className="secondary full"
                  onClick={() => {
                    const side = api.start({
                      ...match.config,
                      color: match.human === 'w' ? 'b' : 'w',
                    });
                    setFlipped(side === 'b');
                    setViewPly(null);
                  }}
                >
                  Реванш · сменить цвет
                </button>
              )}
              {outcome && (
                <button
                  className="primary full"
                  onClick={() => {
                    setDraft(match.config);
                    setSetup(true);
                  }}
                >
                  Новая партия <ArrowRight size={16} />
                </button>
              )}
              <p className="quiet-note session-note">
                Партия сохраняется в этом браузере. После перезагрузки продолжите её с паузы.
              </p>
            </>
          )}
        </aside>
      </div>
      {api.promotion && !outcome && (
        <PromotionDialog
          color={game.turn()}
          onChoose={api.promote}
          onCancel={api.cancelPromotion}
        />
      )}
    </>
  );
}
