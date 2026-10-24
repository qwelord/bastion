import { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Lightbulb, RotateCcw } from 'lucide-react';
import { Board } from '../components/Board';
import { exercisePosition } from '../data/demo';
import type { Settings } from '../state';
export function Lesson({ settings }: { settings: Settings }) {
  const [selected, setSelected] = useState<string>();
  const [answer, setAnswer] = useState<'correct' | 'wrong' | null>(null);
  const [hint, setHint] = useState(false);
  const [complete, setComplete] = useState(false);
  const respond = (ok: boolean) => {
    setAnswer(ok ? 'correct' : 'wrong');
    setSelected(undefined);
  };
  const square = (s: string) => {
    if (answer === 'correct') return;
    if (s === 'e1') {
      setSelected(s);
      return;
    }
    if (selected === 'e1') respond(s === 'e8');
  };
  const reset = () => {
    setAnswer(null);
    setSelected(undefined);
    setHint(false);
    setComplete(false);
  };
  return (
    <>
      <a href="#learn" className="back-link">
        <ArrowLeft size={15} /> К программе обучения
      </a>
      <div className="page-intro">
        <div>
          <h1>Мат на последней горизонтали</h1>
          <p>Основы тактики / Открытый урок</p>
        </div>
        <span className="tag">{complete ? 'Урок пройден' : 'Практика на доске'}</span>
      </div>
      <div className="lesson-layout">
        <div className="board-column">
          <div className="lesson-board-label">
            <span>Ход белых</span>
            <span>Найдите мат в один ход</span>
          </div>
          <Board
            settings={settings}
            position={
              answer === 'correct' ? { ...exercisePosition, e1: '', e8: 'wr' } : exercisePosition
            }
            selected={selected}
            highlight={answer === 'correct' ? ['e1', 'e8'] : []}
            onSquare={square}
          />
          <p className="quiet-note board-caption">
            Выберите ладью на e1 и поле назначения. Можно также выбрать ответ справа.
          </p>
        </div>
        <article className="lesson-text">
          <span className="lesson-step">Идея позиции</span>
          <h2>
            Собственные пешки
            <br />
            могут стать стеной.
          </h2>
          <p>
            Чёрный король укрыт пешками f7, g7 и h7. Но сейчас они отнимают у него все поля для
            отступления.
          </p>
          <p>
            Ладья может выйти на восьмую горизонталь с шахом. Король не сможет ни уйти с неё, ни
            закрыться от удара.
          </p>
          <div className="lesson-question">
            <h3>Как закончить партию?</h3>
            <div className="answer-options">
              {[
                ['Re7', 'На седьмую горизонталь', false],
                ['Re8#', 'На последнюю горизонталь', true],
                ['Kf1', 'Приблизить короля', false],
              ].map(([move, text, ok]) => (
                <button
                  key={String(move)}
                  disabled={answer === 'correct'}
                  onClick={() => respond(Boolean(ok))}
                >
                  <strong>{move}</strong>
                  <span>{text}</span>
                  <ArrowRight size={16} />
                </button>
              ))}
            </div>
          </div>
          {answer && (
            <div className={'answer-feedback ' + answer} role="status">
              {answer === 'correct' ? (
                <>
                  <CheckCircle2 size={20} />
                  <div>
                    <strong>Верно. 1. Re8#</strong>
                    <p>
                      Ладья контролирует f8 и h8, а свои пешки закрывают королю седьмую горизонталь.
                      Это мат.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Lightbulb size={20} />
                  <div>
                    <strong>Попробуйте ещё раз.</strong>
                    <p>
                      Нужен шах по восьмой горизонтали. Посмотрите, на какое поле может сразу
                      попасть ладья.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
          {hint && answer !== 'correct' && (
            <p className="notice">
              Вертикаль e свободна. Поднимите ладью на e8 и проверьте все поля вокруг чёрного
              короля.
            </p>
          )}
          <div className="lesson-actions">
            {answer === 'correct' ? (
              <button
                className="primary"
                onClick={() => {
                  setComplete(true);
                  try {
                    localStorage.setItem('bastion.lesson.backrank', 'complete');
                  } catch {}
                }}
              >
                {complete ? 'Урок отмечен пройденным' : 'Завершить урок'}
                <CheckCircle2 size={16} />
              </button>
            ) : (
              <button className="text-button" onClick={() => setHint(!hint)}>
                <Lightbulb size={17} />
                {hint ? 'Скрыть подсказку' : 'Нужна подсказка'}
              </button>
            )}
            <button className="icon-button" aria-label="Повторить урок" onClick={reset}>
              <RotateCcw size={17} />
            </button>
          </div>
          <p className="quiet-note">
            Практический вывод: следите за безопасным полем для короля. Ход пешкой создаёт
            «форточку», но его тоже нужно проверять на угрозы.
          </p>
        </article>
      </div>
    </>
  );
}
