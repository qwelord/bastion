import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  RotateCcw,
  Repeat2,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  List,
  Eye,
} from 'lucide-react';
import { Board } from '../components/Board';
import { PromotionDialog } from '../components/GameDialogs';
import { lessons, findLesson } from '../learning/catalog';
import { courseForLesson, courseLink, courseLessons } from '../learning/courses';
import { applyUci, type LessonDefinition } from '../learning/schema';
import { StepSession } from '../learning/session';
import {
  emptyLessonProgress,
  lessonLink,
  lessonStats,
  readLearning,
  recordStep,
  updateLearning,
  applyStepRecord,
  hasOpenAttempt,
} from '../learning/progress';
import { ChessGame, type Promotion } from '../chess/rules';
import { moveSound, unlockSound } from '../chess/sound';
import type { Settings } from '../state';
function routeLesson() {
  const route = location.hash.slice(1).split('/')[1]?.split('?')[0];
  return route && /^[a-z][a-z0-9-]{0,63}$/.test(route) ? route : 'backrank';
}
export function Lesson({ settings }: { settings: Settings }) {
  const [id, setId] = useState(routeLesson);
  useEffect(() => {
    const update = () => setId(routeLesson());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  const lesson = findLesson(id);
  if (!lesson)
    return (
      <>
        <a className="back-link" href="#learn">
          <ArrowLeft size={15} />К урокам
        </a>
        <div className="empty-state surface">
          <h1>Урок не найден</h1>
          <p>Возможно, ссылка устарела. Выберите урок в каталоге.</p>
          <a className="primary" href="#learn">
            Открыть обучение
          </a>
        </div>
      </>
    );
  return <LessonPlayer key={id} lesson={lesson} settings={settings} />;
}
function LessonPlayer({ lesson, settings }: { lesson: LessonDefinition; settings: Settings }) {
  const [progress, setProgress] = useState(() => readLearning(lessons));
  const reviewMode = useRef(location.hash.endsWith('?review=1')).current;
  const initial = reviewMode
    ? Math.max(
        0,
        lesson.steps.findIndex((s) => progress.entries[lesson.id]?.steps[s.id]?.needsReview),
      )
    : (progress.entries[lesson.id]?.cursor ?? 0);
  const [index, setIndex] = useState(initial);
  const [session, setSession] = useState(
    () =>
      new StepSession(
        lesson.steps[initial],
        reviewMode
          ? undefined
          : progress.entries[lesson.id]?.steps[lesson.steps[initial].id]?.snapshot,
      ),
  );
  const [, paint] = useState(0);
  const [summary, setSummary] = useState(
    () =>
      !reviewMode &&
      lessonStats(lesson, progress.entries[lesson.id]).finished &&
      !hasOpenAttempt(lesson, progress.entries[lesson.id]),
  );
  const [selected, setSelected] = useState<string>();
  const [flipped, setFlipped] = useState(false);
  const [demoPly, setDemoPly] = useState(0);
  const [showOutline, setShowOutline] = useState(false);
  const [showMoves, setShowMoves] = useState(true);
  const [error, setError] = useState('');
  const [note, setNote] = useState(progress.entries[lesson.id]?.note ?? '');
  const savedNote = useRef(note);
  const [promotion, setPromotion] = useState<{ from: string; to: string } | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const stepAreaRef = useRef<HTMLDivElement>(null);
  const previousIndex = useRef(index);
  const step = lesson.steps[index];
  const entry = progress.entries[lesson.id] ?? emptyLessonProgress(lesson);
  const stats = lessonStats(lesson, entry);
  function save(active = session, cursor = index) {
    try {
      const next = recordStep(lessons, lesson, cursor, active.snapshot());
      setProgress(next);
      setError('');
      return next;
    } catch (e) {
      setError((e as Error).message);
      const temporary = structuredClone(progress);
      applyStepRecord(temporary, lesson, cursor, active.snapshot());
      setProgress(temporary);
      return temporary;
    }
  }
  useEffect(() => {
    save();
  }, [session]);
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
    if (previousIndex.current !== index && window.matchMedia('(max-width: 760px)').matches)
      stepAreaRef.current?.scrollIntoView({
        block: 'start',
        behavior:
          settings.motion && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'smooth'
            : 'auto',
      });
    previousIndex.current = index;
  }, [index, summary]);
  function changed() {
    paint((v) => v + 1);
    save();
  }
  function go(next: number, fresh = false) {
    const stored = save();
    setIndex(next);
    setSession(
      new StepSession(
        lesson.steps[next],
        fresh ? undefined : stored.entries[lesson.id]?.steps[lesson.steps[next].id]?.snapshot,
      ),
    );
    setSelected(undefined);
    setPromotion(null);
    setDemoPly(0);
    setShowOutline(false);
    setSummary(false);
  }
  function saveNote() {
    if (savedNote.current === note) return;
    try {
      setProgress(
        updateLearning(lessons, (data) => {
          const value = (data.entries[lesson.id] ??= emptyLessonProgress(lesson));
          value.note = note.slice(0, 2000);
        }),
      );
      savedNote.current = note;
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (note === savedNote.current) return;
    const timer = setTimeout(saveNote, 350);
    return () => clearTimeout(timer);
  }, [note]);
  function restart() {
    save();
    setSession(new StepSession(step));
    setSelected(undefined);
    setDemoPly(0);
    setPromotion(null);
  }
  function shortcuts(event: KeyboardEvent<HTMLDivElement>) {
    if (
      event.defaultPrevented ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      (event.target as HTMLElement).closest(
        'input,textarea,select,button,a,summary,[data-square]',
      ) ||
      summary
    )
      return;
    const key = event.key.toLowerCase();
    if ((key === 'n' || key === 'т') && (step.kind === 'explain' || session.state.complete)) {
      event.preventDefault();
      advance();
    }
    if ((key === 'h' || key === 'р') && step.kind !== 'explain' && !session.state.complete) {
      event.preventDefault();
      session.hint();
      changed();
    }
    if (key === 'r' || key === 'к') {
      event.preventDefault();
      restart();
    }
  }
  function move(from: string, to: string, piece?: Promotion) {
    if (step.kind !== 'move' || session.state.complete) return;
    if (!piece && session.game.needsPromotion(from, to)) {
      setPromotion({ from, to });
      return;
    }
    if (settings.sound) unlockSound();
    const accepted = session.move(from + to + (piece ?? ''));
    setPromotion(null);
    setSelected(undefined);
    if (accepted && settings.sound) {
      const last = session.game.history().at(-1);
      moveSound(!!last?.captured, session.game.inCheck(), session.state.complete, settings.volume);
    }
    changed();
  }
  const movable: string[] =
    step.kind === 'move' && !session.state.complete
      ? [...new Set(session.game.moves().map((m) => m.from))]
      : [];
  function square(s: string) {
    if (step.kind === 'squares') {
      session.toggleSquare(s);
      changed();
      return;
    }
    if (step.kind !== 'move' || session.state.complete) return;
    if (s === selected) {
      setSelected(undefined);
      return;
    }
    if (movable.includes(s)) {
      setSelected(s);
      return;
    }
    if (selected) move(selected, s);
  }
  function advance() {
    if (step.kind === 'explain') session.read();
    if (!session.state.complete) return;
    const nextProgress = save();
    if (reviewMode) {
      const nextIndex = lesson.steps.findIndex(
        (s, i) => i > index && nextProgress.entries[lesson.id]?.steps[s.id]?.needsReview,
      );
      if (nextIndex >= 0) {
        go(nextIndex, true);
        return;
      }
      setSummary(true);
      return;
    }
    if (index < lesson.steps.length - 1) go(index + 1);
    else if (lessonStats(lesson, nextProgress.entries[lesson.id]).finished) setSummary(true);
    else
      go(lesson.steps.findIndex((s) => !nextProgress.entries[lesson.id]?.steps[s.id]?.completed));
  }
  function favorite() {
    try {
      setProgress(
        updateLearning(lessons, (data) => {
          const p = (data.entries[lesson.id] ??= emptyLessonProgress(lesson));
          p.favorite = !p.favorite;
        }),
      );
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const viewGame = step.kind === 'explain' ? new ChessGame(step.fen) : session.game;
  if (step.kind === 'explain') step.line?.slice(0, demoPly).forEach((m) => applyUci(viewGame, m));
  const history = viewGame.history();
  const hintFocus =
    step.kind === 'move' && session.state.hints === step.hints.length
      ? step.lines.find((line) => session.state.trail.every((m, i) => line[i] === m))?.[
          session.state.trail.length
        ]
      : undefined;
  const emphasis =
    step.kind === 'explain'
      ? (step.focus ?? [])
      : hintFocus
        ? [hintFocus.slice(0, 2), hintFocus.slice(2, 4)]
        : [];
  const course = courseForLesson(lesson.id);
  const sequence = course ? courseLessons(course) : lessons.filter((l) => !courseForLesson(l.id));
  const following = sequence[sequence.findIndex((l) => l.id === lesson.id) + 1];
  const otherReview = lessons.find(
    (l) => l.id !== lesson.id && lessonStats(l, progress.entries[l.id]).review > 0,
  );
  return (
    <div className="lesson-player" onKeyDown={shortcuts}>
      <a href={course ? courseLink(course.id) : '#learn/lessons'} className="back-link">
        <ArrowLeft size={15} />
        {course ? course.title : 'К программе обучения'}
      </a>
      <div className="page-intro">
        <div>
          <h1>{lesson.title}</h1>
          <p>
            {lesson.topic} · {lesson.level} · {lesson.minutes} мин.
          </p>
        </div>
        <button className="secondary" aria-pressed={entry.favorite} onClick={favorite}>
          <Bookmark size={16} fill={entry.favorite ? 'currentColor' : 'none'} />
          {entry.favorite ? 'В избранном' : 'Сохранить урок'}
        </button>
      </div>
      {lesson.prerequisites.length > 0 && (
        <details className="study-prerequisites">
          <summary>Какие темы пригодятся</summary>
          <div>
            {lesson.prerequisites.map((id) => {
              const prerequisite = findLesson(id);
              return prerequisite ? (
                <a className="text-button" key={id} href={lessonLink(id)}>
                  {prerequisite.title}
                  <ArrowRight size={13} />
                </a>
              ) : null;
            })}
          </div>
          <p className="quiet-note">
            Это рекомендации. Текущий урок открыт независимо от предыдущего прогресса.
          </p>
        </details>
      )}
      {error && (
        <div className="learning-save-error" role="alert">
          <p>{error}</p>
          <button className="text-button" onClick={() => save()}>
            Повторить сохранение
          </button>
        </div>
      )}
      {summary ? (
        <section className="lesson-summary surface">
          <CheckCircle2 size={34} />
          <h2 ref={titleRef} tabIndex={-1}>
            {reviewMode ? 'Повторение завершено' : 'Урок пройден'}
          </h2>
          <p>{lesson.objective}</p>
          <div className="lesson-takeaways">
            <h3>Что забрать в свою игру</h3>
            <ul>
              {lesson.takeaways.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <p className="quiet-note">
            {stats.complete} из {stats.total} шагов пройдено.
            {stats.review
              ? ` Стоит повторить: ${stats.review}.`
              : ' Можно перейти к следующей теме.'}
          </p>
          <div className="lesson-summary-actions">
            {stats.review > 0 ? (
              <button
                className="primary"
                onClick={() =>
                  go(
                    Math.max(
                      0,
                      lesson.steps.findIndex((s) => entry.steps[s.id]?.needsReview),
                    ),
                    true,
                  )
                }
              >
                Закрепить без подсказок
                <RotateCcw size={16} />
              </button>
            ) : reviewMode && otherReview ? (
              <a className="primary" href={lessonLink(otherReview.id) + '?review=1'}>
                Следующие трудные задания
                <ArrowRight size={16} />
              </a>
            ) : following ? (
              <a className="primary" href={lessonLink(following.id)}>
                Следующий урок
                <ArrowRight size={16} />
              </a>
            ) : (
              <a className="primary" href={course ? courseLink(course.id) : '#learn'}>
                {course ? 'К итогам курса' : 'К программе'}
                <ArrowRight size={16} />
              </a>
            )}
            <button className="secondary" onClick={() => go(0, true)}>
              Пройти ещё раз
            </button>
            {stats.review > 0 && following && (
              <a className="secondary" href={lessonLink(following.id)}>
                Следующий урок
                <ArrowRight size={16} />
              </a>
            )}
            {stats.review > 0 && !following && course && (
              <a className="secondary" href={courseLink(course.id)}>
                К итогам курса
              </a>
            )}
            <a className="text-button" href="#learn">
              Все уроки
            </a>
          </div>
        </section>
      ) : (
        <>
          <div className="lesson-progress" ref={stepAreaRef}>
            <button
              className="icon-button"
              disabled={index === 0}
              aria-label="Предыдущий шаг урока"
              onClick={() => go(index - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <span>
              {reviewMode ? 'Повторение' : 'Шаг'} {index + 1} из {lesson.steps.length}
            </span>
            <div className="lesson-step-track">
              {lesson.steps.map((s, i) => (
                <button
                  key={s.id}
                  title={s.title}
                  aria-label={`Шаг ${i + 1}: ${s.title}`}
                  aria-current={i === index ? 'step' : undefined}
                  className={entry.steps[s.id]?.completed ? 'done' : ''}
                  onClick={() => go(i)}
                />
              ))}
            </div>
            <button
              className="text-button"
              aria-expanded={showOutline}
              onClick={() => setShowOutline(!showOutline)}
            >
              <List size={16} />
              Содержание
            </button>
          </div>
          {showOutline && (
            <nav className="lesson-outline surface" aria-label="Содержание урока">
              {lesson.steps.map((s, i) => (
                <button
                  key={s.id}
                  aria-current={i === index ? 'step' : undefined}
                  onClick={() => go(i)}
                >
                  <span>
                    {i + 1}. {s.title}
                  </span>
                  {entry.steps[s.id]?.completed && <CheckCircle2 size={16} />}
                </button>
              ))}
            </nav>
          )}
          <div className="study-layout">
            <section className="study-board-column" aria-label="Учебная доска">
              <div className="study-board-caption">
                <strong>
                  {step.kind === 'move'
                    ? new ChessGame(step.fen).turn() === 'w'
                      ? 'Вы играете белыми'
                      : 'Вы играете чёрными'
                    : step.kind === 'squares'
                      ? 'Отметьте поля'
                      : step.kind === 'choice'
                        ? 'Позиция к вопросу'
                        : 'Разберите пример'}
                </strong>
                <span>
                  {step.kind === 'move' && session.state.complete
                    ? 'Задание решено'
                    : step.kind === 'move'
                      ? 'Ваш ход'
                      : ''}
                </span>
              </div>
              <Board
                settings={settings}
                position={viewGame.position()}
                flipped={flipped}
                selected={selected}
                markedSquares={step.kind === 'squares' ? session.state.squares : undefined}
                emphasis={emphasis}
                highlight={history.length ? [history.at(-1)!.from, history.at(-1)!.to] : []}
                checkedSquare={viewGame.checkedKing()}
                movableSquares={movable}
                legalTargets={
                  showMoves && selected ? session.game.moves(selected).map((m) => m.to) : []
                }
                onSquare={
                  (step.kind === 'squares' && !session.state.complete) ||
                  (step.kind === 'move' && !session.state.complete)
                    ? square
                    : undefined
                }
                onMove={step.kind === 'move' && !session.state.complete ? move : undefined}
                onDragStart={setSelected}
              />
              <div className="board-toolbar">
                <span>
                  {step.kind === 'move'
                    ? 'Перетаскивание и нажатия'
                    : step.kind === 'squares'
                      ? `Отмечено полей: ${session.state.squares.length}`
                      : 'Исследуйте позицию в своём темпе'}
                </span>
                <div>
                  <button
                    className="icon-button"
                    aria-label="Перевернуть учебную доску"
                    onClick={() => setFlipped(!flipped)}
                  >
                    <Repeat2 size={17} />
                  </button>
                  {step.kind === 'move' && (
                    <button
                      className="icon-button"
                      aria-label="Подсветка возможных ходов"
                      aria-pressed={showMoves}
                      onClick={() => setShowMoves(!showMoves)}
                    >
                      <Eye size={17} />
                    </button>
                  )}
                </div>
              </div>
              {step.kind === 'explain' && step.line && (
                <div className="example-controls">
                  <button
                    className="secondary"
                    disabled={!demoPly}
                    onClick={() => setDemoPly(demoPly - 1)}
                  >
                    <ChevronLeft size={16} />
                    Назад
                  </button>
                  <span>
                    {demoPly ? history.at(-1)?.san : 'Начало'} · {demoPly}/{step.line.length}
                  </span>
                  <button
                    className="secondary"
                    disabled={demoPly === step.line.length}
                    onClick={() => setDemoPly(demoPly + 1)}
                  >
                    Ход примера
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
              {step.kind === 'move' && history.length > 0 && (
                <p className="study-line">{history.map((m) => m.san).join('  ')}</p>
              )}
            </section>
            <article className="study-panel">
              <span className="study-kind">
                {step.kind === 'explain'
                  ? 'Разберём идею'
                  : step.kind === 'move'
                    ? 'Практика на доске'
                    : step.kind === 'choice'
                      ? 'Проверьте понимание'
                      : 'Найдите на доске'}
              </span>
              <h2 ref={titleRef} tabIndex={-1}>
                {step.title}
              </h2>
              {step.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              {step.kind === 'choice' && (
                <div className="study-options" aria-label="Варианты ответа">
                  {step.options.map((option) => (
                    <button
                      className={session.state.choice === option.id ? 'chosen' : ''}
                      key={option.id}
                      disabled={session.state.complete}
                      aria-pressed={session.state.choice === option.id}
                      onClick={() => {
                        session.choose(option.id);
                        changed();
                      }}
                    >
                      {option.label}
                      {session.state.complete && option.id === step.answer && (
                        <CheckCircle2 size={17} />
                      )}
                    </button>
                  ))}
                </div>
              )}
              {step.kind === 'squares' && !session.state.complete && (
                <button
                  className="secondary full"
                  disabled={!session.state.squares.length}
                  onClick={() => {
                    session.checkSquares();
                    changed();
                  }}
                >
                  Проверить поля
                </button>
              )}
              <div className={'study-feedback ' + session.status} role="status" aria-live="polite">
                {session.message && (
                  <>
                    <strong>
                      {session.state.revealed
                        ? 'Разобрано с решением'
                        : session.status === 'correct'
                          ? 'Верно'
                          : session.status === 'wrong'
                            ? 'Попробуйте иначе'
                            : 'Продолжайте'}
                    </strong>
                    <p>{session.message}</p>
                  </>
                )}
              </div>
              {step.kind !== 'explain' && session.state.hints > 0 && (
                <ol className="study-hints">
                  {step.hints.slice(0, session.state.hints).map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ol>
              )}
              <div className="study-actions">
                {step.kind !== 'explain' && !session.state.complete && (
                  <>
                    <button
                      className="text-button"
                      disabled={session.state.hints >= step.hints.length}
                      onClick={() => {
                        session.hint();
                        changed();
                      }}
                    >
                      <Lightbulb size={16} />
                      Подсказка {Math.min(session.state.hints + 1, step.hints.length)}/
                      {step.hints.length}
                    </button>
                    {session.state.hints >= step.hints.length && (
                      <button
                        className="text-button"
                        onClick={() => {
                          session.reveal();
                          changed();
                        }}
                      >
                        Показать решение
                      </button>
                    )}
                  </>
                )}
                <button className="text-button" onClick={restart}>
                  <RotateCcw size={15} />
                  {step.kind === 'explain' ? 'К началу примера' : 'Решить заново'}
                </button>
              </div>
              <button
                className="primary full study-next"
                disabled={step.kind !== 'explain' && !session.state.complete}
                onClick={advance}
              >
                {index === lesson.steps.length - 1
                  ? 'Завершить урок'
                  : step.kind === 'explain'
                    ? 'Понятно, дальше'
                    : 'Следующий шаг'}
                <ArrowRight size={17} />
              </button>
              <p className="quiet-note study-save-note">
                Без таймера. Можно ошибаться: позиция останется на месте. Прогресс сохраняется
                автоматически.
              </p>
            </article>
          </div>
        </>
      )}
      <div className="study-extras">
        <details>
          <summary>
            Моя заметка к уроку
            {note ? (note === savedNote.current ? ' · сохранена' : ' · не сохранена') : ''}
          </summary>
          <label htmlFor="lesson-note" className="quiet-note">
            Запишите свою формулировку идеи или вопрос для повторения.
          </label>
          <textarea
            id="lesson-note"
            maxLength={2000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={saveNote}
            placeholder="Что хочется запомнить?"
          />
          <small>{note.length}/2000 · сохраняется в этом браузере</small>
        </details>
        <details>
          <summary>Обозначения и управление</summary>
          <dl>
            {[
              ['K', 'король'],
              ['Q', 'ферзь'],
              ['R', 'ладья'],
              ['B', 'слон'],
              ['N', 'конь'],
              ['x', 'взятие'],
              ['+', 'шах'],
              ['#', 'мат'],
              ['O-O / O-O-O', 'короткая / длинная рокировка'],
            ].map(([term, value]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p>
            Пешка записывается без буквы фигуры. Например, Nf3 — конь на f3, exd5 — пешка с
            вертикали e берёт на d5.
          </p>
          <p>
            На доске: стрелки перемещают фокус, Enter выбирает поле. Вне полей и элементов ввода: N
            — дальше, H — подсказка, R — заново. Работает и русская раскладка.
          </p>
        </details>
      </div>
      {promotion && (
        <PromotionDialog
          timed={false}
          color={session.game.turn()}
          onChoose={(piece) => move(promotion.from, promotion.to, piece)}
          onCancel={() => setPromotion(null)}
        />
      )}
    </div>
  );
}
