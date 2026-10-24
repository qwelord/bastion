import { readProfile } from '../data/profile';
import { ReviewService } from '../engine/review';
import { archiveGame } from '../data/games';
import { useEffect, useRef, useState } from 'react';
import { type MoveInput, type Promotion } from './rules';
import { Match, defaultConfig, type MatchConfig } from './match';
import { StockfishClient } from '../engine/stockfish';
import { normalizeStrength, type Strength } from '../engine/strength';

const STORAGE = 'bastion.match.v1';
function restore() {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (raw && raw.length > 1_000_000) return new Match();
    return raw ? Match.restore(JSON.parse(raw)) : new Match();
  } catch {
    return new Match();
  }
}
function persist(match: Match) {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(match.save(performance.now())));
  } catch {
    throw new Error('Не удалось сохранить партию. Проверьте доступ браузера к хранилищу.');
  }
}
export function useMatch() {
  const [initial] = useState(restore);
  const matchRef = useRef(initial);
  const [client] = useState(() => new StockfishClient());
  const [version, setVersion] = useState(0);
  const [now, setNow] = useState(() => performance.now());
  const [enginePhase, setEnginePhase] = useState<
    'idle' | 'loading' | 'thinking' | 'ready' | 'error'
  >('idle');
  const [engineName, setEngineName] = useState('Stockfish 19');
  const [depth, setDepth] = useState(0);
  const [error, setError] = useState('');
  const [promotion, setPromotion] = useState<{ from: string; to: string } | null>(null);
  const [storageError, setStorageError] = useState('');
  const [gameId] = useState(() => {
    try {
      const id = localStorage.getItem('bastion.match.id');
      if (id && /^[\w-]{1,80}$/.test(id)) return id;
    } catch {
      /* Use session ID. */
    }
    return crypto.randomUUID();
  });
  const idRef = useRef<string>(gameId);
  const conflict = useRef(false);
  const save = () => {
    if (conflict.current) return;
    try {
      persist(matchRef.current);
      localStorage.setItem('bastion.match.id', idRef.current);
      archiveGame(idRef.current, matchRef.current.save(performance.now()));
      setStorageError('');
    } catch (e) {
      setStorageError((e as Error).message);
    }
  };
  const intent = useRef(0);
  const publish = () => {
    setVersion((v) => v + 1);
    setNow(performance.now());
  };
  const stop = () => {
    intent.current++;
    client.cancel();
    drawEngine.cancel();
    setDrawBusy(false);
    setDrawMessage('');
    setPromotion(null);
    setError('');
  };
  useEffect(() => {
    const checkpoint = () => {
      if (conflict.current) return;
      try {
        persist(matchRef.current);
        archiveGame(idRef.current, matchRef.current.save(performance.now()));
      } catch {
        setStorageError('Не удалось сохранить партию. Проверьте свободное место.');
      }
    };
    const visibility = () => {
      if (document.visibilityState === 'hidden') checkpoint();
    };
    const externalSave = (event: StorageEvent) => {
      if (event.key !== STORAGE || event.newValue === event.oldValue) return;
      conflict.current = true;
      stop();
      matchRef.current.pause(performance.now());
      setEnginePhase('idle');
      publish();
    };
    window.addEventListener('storage', externalSave);
    window.addEventListener('pagehide', checkpoint);
    document.addEventListener('visibilitychange', visibility);
    const timer = setInterval(() => {
      const n = performance.now();
      if (matchRef.current.checkTimeout(n)) {
        client.cancel();
        publish();
      }
      setNow(n);
    }, 100);
    return () => {
      clearInterval(timer);
      window.removeEventListener('pagehide', checkpoint);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('storage', externalSave);
      try {
        if (!conflict.current) {
          persist(matchRef.current);
          archiveGame(idRef.current, matchRef.current.save(performance.now()));
        }
      } catch {
        /* Reported during normal saves. */
      }
      intent.current++;
      client.dispose();
    };
  }, [client]);
  useEffect(() => {
    save();
  }, [version]);
  useEffect(() => {
    const match = matchRef.current;
    if (
      !match.started ||
      match.paused ||
      match.game.outcome() ||
      match.config.opponent !== 'stockfish' ||
      match.game.turn() === match.human
    )
      return;
    if (match.game.claimableDraw()) {
      match.game.claimDraw();
      publish();
      return;
    }
    let active = true;
    const expectedFen = match.game.fen();
    setEnginePhase('thinking');
    setDepth(0);
    client
      .search({
        position: match.game.enginePosition(),
        kind: match.config.engine,
        strength: match.config.strength,
        legalCount: match.game.moves().length,
        moveTime: Math.min(
          1200,
          Math.max(
            60,
            match.config.minutes ? match.clocks(performance.now())[match.game.turn()] / 30 : 700,
          ),
        ),
        onDepth: (d) => {
          if (active) setDepth(d);
        },
      })
      .then((reply) => {
        if (
          !active ||
          match !== matchRef.current ||
          match.game.fen() !== expectedFen ||
          match.paused ||
          match.game.outcome()
        )
          return;
        const move: MoveInput = {
          from: reply.move.slice(0, 2),
          to: reply.move.slice(2, 4),
          ...(reply.move[4] ? { promotion: reply.move[4] as Promotion } : {}),
        };
        if (!match.play(move, performance.now())) {
          if (!match.game.outcome())
            throw new Error('Движок вернул нелегальный ход. Партия приостановлена.');
        }
        setEngineName(reply.name);
        setEnginePhase('ready');
        publish();
      })
      .catch((reason) => {
        if (!active || (reason instanceof DOMException && reason.name === 'AbortError')) return;
        match.pause(performance.now());
        setError(reason instanceof Error ? reason.message : 'Ошибка движка');
        setEnginePhase('error');
        publish();
      });
    return () => {
      active = false;
      client.cancel();
    };
  }, [version, client]);
  async function activate(match: Match) {
    if (conflict.current) return;
    const token = ++intent.current;
    setError('');
    setPromotion(null);
    if (match.config.opponent === 'stockfish') {
      setEnginePhase('loading');
      try {
        const name = await client.load(match.config.engine);
        if (intent.current !== token || matchRef.current !== match) return;
        setEngineName(name);
        setEnginePhase('ready');
      } catch (reason) {
        if (token !== intent.current) return;
        setError(reason instanceof Error ? reason.message : 'Не удалось запустить Stockfish');
        setEnginePhase('error');
        publish();
        return;
      }
    } else setEnginePhase('idle');
    if (token !== intent.current) return;
    match.start(performance.now());
    publish();
  }
  function start(config: MatchConfig) {
    stop();
    client.dispose();
    save();
    conflict.current = false;
    idRef.current = crypto.randomUUID();
    const match = new Match(config);
    match.game.setPlayers(
      match.human === 'w' ? readProfile() : 'Stockfish 19',
      match.human === 'b' ? readProfile() : 'Stockfish 19',
    );
    if (config.opponent === 'local') match.game.setPlayers('Белые', 'Чёрные');
    match.started = true;
    matchRef.current = match;
    publish();
    void activate(match);
    return match.human;
  }
  function pause() {
    stop();
    matchRef.current.pause(performance.now());
    setEnginePhase('idle');
    publish();
  }
  function resume() {
    void activate(matchRef.current);
  }
  function play(from: string, to: string, promoted?: Promotion) {
    const match = matchRef.current;
    if (!match.canInteract()) return false;
    if (!promoted && match.game.needsPromotion(from, to)) {
      setPromotion({ from, to });
      return true;
    }
    const result = match.play(
      { from, to, ...(promoted ? { promotion: promoted } : {}) },
      performance.now(),
    );
    setPromotion(null);
    if (result) {
      setError('');
      publish();
      return true;
    }
    return false;
  }
  function promote(piece: Promotion) {
    if (promotion) play(promotion.from, promotion.to, piece);
  }
  function undo() {
    stop();
    matchRef.current.undo(performance.now());
    setEnginePhase('ready');
    publish();
  }
  function resign() {
    stop();
    matchRef.current.resign(performance.now());
    publish();
  }
  function claimDraw() {
    stop();
    matchRef.current.claimDraw(performance.now());
    publish();
  }
  function agreeDraw() {
    stop();
    matchRef.current.agreeDraw(performance.now());
    publish();
  }
  const [drawMessage, setDrawMessage] = useState('');
  const [drawBusy, setDrawBusy] = useState(false);
  const [drawEngine] = useState(() => new ReviewService());
  useEffect(() => () => drawEngine.dispose(), [drawEngine]);
  async function offerDraw() {
    const match = matchRef.current;
    if (!match.canInteract() || match.game.outcome() || drawBusy) return;
    pause();
    const token = intent.current;
    setDrawBusy(true);
    setDrawMessage('Stockfish оценивает предложение…');
    try {
      const result = await drawEngine.evaluate(match.game, match.config.engine, 700);
      if (intent.current !== token || matchRef.current !== match) return;
      if (match.game.history().length >= 20 && Math.abs(result.score) <= 35) {
        match.game.finish({ result: '1/2-1/2', reason: 'Ничья по соглашению' });
        setDrawMessage('Stockfish принял предложение.');
        publish();
      } else {
        setDrawMessage('Stockfish продолжит борьбу. Нажмите «Продолжить партию».');
      }
    } catch (e) {
      if (intent.current === token) setDrawMessage((e as Error).message);
    } finally {
      if (intent.current === token && matchRef.current === match) setDrawBusy(false);
    }
  }
  function updateStrength(strength: Strength) {
    stop();
    const match = matchRef.current;
    match.pause(performance.now());
    match.config = { ...match.config, strength: normalizeStrength(strength) };
    publish();
    void activate(match);
  }
  return {
    match: matchRef.current,
    now,
    version,
    enginePhase,
    engineName,
    depth,
    error: conflict.current
      ? 'Партия изменилась в другой вкладке. Перезагрузите страницу, чтобы открыть актуальное сохранение, или начните новую партию.'
      : error || storageError,
    storageConflict: conflict.current,
    gameId: idRef.current,
    promotion,
    start,
    pause,
    resume,
    play,
    promote,
    cancelPromotion: () => setPromotion(null),
    undo,
    resign,
    claimDraw,
    agreeDraw,
    updateStrength,
    offerDraw,
    drawMessage,
    drawBusy,
    defaultConfig,
  };
}
