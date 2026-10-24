import { useState } from 'react';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Repeat2,
  Info,
  ArrowRight,
} from 'lucide-react';
import { Board } from '../components/Board';
import { demoPosition, moves } from '../data/demo';
import type { Settings } from '../state';
export function isSaved() {
  try {
    return localStorage.getItem('bastion.saved.demo') === 'true';
  } catch {
    return false;
  }
}
export function Analysis({ settings }: { settings: Settings }) {
  const [ply, setPly] = useState(10);
  const [flipped, setFlipped] = useState(false);
  const [saved, setSaved] = useState(isSaved);
  const [tab, setTab] = useState('Идеи');
  const [message, setMessage] = useState('');
  const save = () => {
    try {
      localStorage.setItem('bastion.saved.demo', String(!saved));
      setSaved(!saved);
      setMessage(saved ? 'Убрано из избранного.' : 'Добавлено в библиотеку.');
    } catch {
      setMessage('Браузер не разрешил сохранить закладку.');
    }
  };
  return (
    <>
      <div className="page-intro">
        <div>
          <h1>За каждым ходом — идея.</h1>
          <p>Испанская партия. Классическое развитие фигур.</p>
        </div>
        <button className="secondary" aria-pressed={saved} onClick={save}>
          <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
          {saved ? 'В избранном' : 'Сохранить'}
        </button>
      </div>
      <div className="analysis-layout">
        <div className="board-column">
          <div className="lesson-board-label">
            <span>Образец партии</span>
            <span>{ply % 2 ? 'Ход чёрных' : 'Ход белых'}</span>
          </div>
          <Board
            settings={settings}
            position={demoPosition(ply)}
            flipped={flipped}
            highlight={ply ? moves[ply - 1].slice(0, 2) : []}
          />
          <div className="analysis-controls">
            <button
              className="icon-button"
              aria-label="Перевернуть доску анализа"
              onClick={() => setFlipped(!flipped)}
            >
              <Repeat2 size={17} />
            </button>
            <div>
              <button
                className="icon-button"
                aria-label="Первый ход"
                disabled={ply === 0}
                onClick={() => setPly(0)}
              >
                <ChevronsLeft size={19} />
              </button>
              <button
                className="icon-button"
                aria-label="Предыдущий ход анализа"
                disabled={ply === 0}
                onClick={() => setPly(ply - 1)}
              >
                <ChevronLeft size={20} />
              </button>
              <span>
                {ply} / {moves.length}
              </span>
              <button
                className="icon-button"
                aria-label="Следующий ход анализа"
                disabled={ply === moves.length}
                onClick={() => setPly(ply + 1)}
              >
                <ChevronRight size={20} />
              </button>
              <button
                className="icon-button"
                aria-label="Последний ход"
                disabled={ply === moves.length}
                onClick={() => setPly(moves.length)}
              >
                <ChevronsRight size={19} />
              </button>
            </div>
          </div>
          <div className="analysis-disclosure">
            <Info size={16} />
            <p>
              Это образец интерфейса разбора. Живой анализ Stockfish будет подключён на этапе 5.
            </p>
          </div>
        </div>
        <aside className="analysis-panel surface">
          <div className="analysis-heading">
            <span className="tag">Учебный образец</span>
            <h2>Испанская партия</h2>
            <p>Открытый дебют / C84</p>
          </div>
          <div className="move-list">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i}>
                <span>{i + 1}.</span>
                {[0, 1].map((j) => (
                  <button
                    className={ply === i * 2 + j + 1 ? 'active' : ''}
                    aria-current={ply === i * 2 + j + 1 ? 'step' : undefined}
                    key={j}
                    onClick={() => setPly(i * 2 + j + 1)}
                  >
                    {moves[i * 2 + j][2]}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="filter-tabs analysis-tabs">
            {['Идеи', 'Варианты'].map((t) => (
              <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
                {t}
              </button>
            ))}
          </div>
          {tab === 'Идеи' ? (
            <div className="analysis-comment">
              <h3>
                {ply < 5
                  ? 'Борьба за центр'
                  : ply < 9
                    ? 'Давление на защитника'
                    : ply < 13
                      ? 'Безопасность короля'
                      : 'Подготовка центра'}
              </h3>
              <p>
                {ply < 5
                  ? 'Пешки e4 и e5 занимают центр. Кони развиваются с темпом: белые атакуют e5, чёрные защищают её.'
                  : ply < 9
                    ? 'Слон на b5 давит на коня c6, который защищает пешку e5. После a6 белые сохраняют слона ходом Ba4.'
                    : ply < 13
                      ? 'Короткая рокировка уводит белого короля из центра. Ладья затем выходит на e1 и поддерживает пешку e4.'
                      : 'Ход c3 поддерживает будущий d4. Чёрные укрепляют центр ходом d6 и завершают развитие рокировкой.'}
              </p>
              <span className="quiet-note">Редакторское объяснение учебного образца.</span>
            </div>
          ) : (
            <div className="analysis-comment">
              <h3>Продолжите исследование</h3>
              <p>
                Переключайте ходы в записи партии. Сравнение нескольких компьютерных вариантов
                появится после подключения движка.
              </p>
              <a href="#lesson" className="text-button">
                Потренировать расчёт <ArrowRight size={15} />
              </a>
            </div>
          )}
        </aside>
      </div>
      {message && (
        <p className="inline-status" role="status">
          {message}
        </p>
      )}
    </>
  );
}
