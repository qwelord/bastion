import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { ArrowRight, Bookmark, BookOpen, Check, Search, RotateCcw } from 'lucide-react';
import { Board } from '../components/Board';
import { ChessGame } from '../chess/rules';
import { lessons, lessonDifficulty, difficultyLabels } from '../learning/catalog';
import { LearningDifficulty } from '../components/LearningDifficulty';
import {
  readLearning,
  lessonStats,
  lessonLink,
  updateLearning,
  emptyLessonProgress,
  hasOpenAttempt,
} from '../learning/progress';
import type { Settings } from '../state';
import { CourseCatalog, CourseDetail } from './Courses';
import { learningLocation, areaForTrack, learningAreas } from '../learning/navigation';
import { useLearningLocation } from '../learning/useLearningLocation';
import { courses, courseForLesson } from '../learning/courses';
export function Learn({ settings }: { settings: Settings }) {
  const [hash, setHash] = useState(() => location.hash);
  useEffect(() => {
    const update = () => setHash(location.hash);
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  const { path } = learningLocation(hash);
  if (path === '#learn/lessons') return <LessonCatalog settings={settings} />;
  if (path.startsWith('#learn/course/')) {
    const course = courses.find((c) => c.id === path.slice('#learn/course/'.length));
    return course ? (
      <CourseDetail key={course.id} course={course} settings={settings} />
    ) : (
      <div className="empty-state">
        <h1>Курс не найден</h1>
        <a href="#learn" className="primary">
          Открыть каталог
        </a>
      </div>
    );
  }
  return <CourseCatalog settings={settings} />;
}
function LessonCatalog({ settings }: { settings: Settings }) {
  const [progress, setProgress] = useState(() => readLearning(lessons));
  const [query, setQuery] = useState('');
  const { area, filter: locationFilter } = useLearningLocation();
  const [filter, setFilter] = useState(() => learningLocation(location.hash).filter);
  useEffect(() => {
    setFilter(locationFilter);
  }, [locationFilter]);
  const normalized = useDeferredValue(query.trim().toLocaleLowerCase('ru'));
  const [topic, setTopic] = useState('Все темы');
  const [error, setError] = useState('');
  const [difficulty, setDifficulty] = useState(0);
  const [page, setPage] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => setPage(0), [query, filter, topic, difficulty]);
  useEffect(() => {
    const refresh = () => setProgress(readLearning(lessons));
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  const done = lessons.filter((l) => lessonStats(l, progress.entries[l.id]).finished).length;
  const review = lessons.filter((l) => lessonStats(l, progress.entries[l.id]).review > 0);
  const last = lessons.find(
    (l) =>
      l.id === progress.lastLesson &&
      (!lessonStats(l, progress.entries[l.id]).finished ||
        hasOpenAttempt(l, progress.entries[l.id])),
  );
  const next =
    last ?? lessons.find((l) => !lessonStats(l, progress.entries[l.id]).finished) ?? lessons[0];
  const nextEntry = progress.entries[next.id];
  const visible = lessons.filter((l) => {
    const entry = progress.entries[l.id];
    const stats = lessonStats(l, entry);
    return (
      (!area || areaForTrack(l.topic) === area) &&
      (topic === 'Все темы' || l.topic === topic) &&
      (!difficulty || lessonDifficulty(l) === difficulty) &&
      `${l.title} ${l.summary} ${l.topic} ${l.objective} ${entry?.note ?? ''} ${courseForLesson(l.id)?.title ?? ''} ${courseForLesson(l.id)?.aliases?.join(' ') ?? ''}`
        .toLocaleLowerCase('ru')
        .includes(normalized) &&
      (filter === 'Все' ||
        (filter === 'Избранное' && entry?.favorite) ||
        (filter === 'В процессе' && !!entry?.visited && !stats.finished) ||
        (filter === 'Пройдено' && stats.finished) ||
        (filter === 'Повторить' && stats.review > 0))
    );
  });
  const pageCount = Math.max(1, Math.ceil(visible.length / 24));
  const currentPage = Math.min(page, pageCount - 1);
  function turnPage(value: number) {
    setPage(value);
    listRef.current?.scrollIntoView({
      block: 'start',
      behavior: settings.motion ? 'smooth' : 'auto',
    });
  }
  return (
    <>
      <a className="back-link" href="#learn">
        ← К курсам
      </a>
      <div className="page-intro">
        <div>
          <h1>{learningAreas.find((item) => item.id === area)?.title ?? 'Учиться, делая ходы'}</h1>
          <p>Короткое объяснение, практика на доске и понятный разбор ответа.</p>
        </div>
        <span className="tag">
          <BookOpen size={14} />
          Уроков: {lessons.length}
        </span>
      </div>
      <section className="learning-hero">
        <div>
          <span className="learning-kicker">
            {nextEntry?.visited ? 'Продолжить обучение' : 'С чего начать'}
          </span>
          <h2>{next.title}</h2>
          <p>{next.summary}</p>
          <div className="learning-meta">
            <span>{next.minutes} минут</span>
            <span>{next.level}</span>
            <span>Шагов: {next.steps.length}</span>
          </div>
          <a className="primary" href={lessonLink(next.id)}>
            {nextEntry?.visited ? 'Продолжить урок' : 'Начать учиться'}
            <ArrowRight size={17} />
          </a>
        </div>
        <div className="learning-preview" aria-hidden="true">
          <Board
            settings={{ ...settings, coordinates: false }}
            position={new ChessGame(next.steps[nextEntry?.cursor ?? 0].fen).position()}
            highlight={next.steps[nextEntry?.cursor ?? 0].focus ?? []}
          />
        </div>
      </section>
      <div className="learning-overview">
        <span>
          Пройдено{' '}
          <strong>
            {done} из {lessons.length}
          </strong>{' '}
          уроков
        </span>
        <progress max={lessons.length} value={done} aria-label="Пройденные уроки" />
        {review.length > 0 && (
          <a className="text-button" href={lessonLink(review[0].id) + '?review=1'}>
            <RotateCcw size={15} />
            Повторить трудные задания
          </a>
        )}
      </div>
      <section aria-label="Каталог уроков" className="learning-catalog">
        <div className="section-title">
          <div>
            <h2>Ваша учебная программа</h2>
            <p className="quiet-note">
              Проходите по порядку или выберите тему. Любой урок можно открыть сразу.
            </p>
          </div>
        </div>
        <div className="catalog-tools">
          <div className="filter-tabs" aria-label="Статус урока">
            {['Все', 'В процессе', 'Пройдено', 'Избранное', 'Повторить'].map((f) => (
              <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>
          <label className="search-box">
            <Search size={17} />
            <input
              maxLength={120}
              aria-label="Поиск урока"
              placeholder="Тема или навык"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        <div className="learning-catalog-heading">
          <label>
            Тема
            <select
              aria-label="Тема обучения"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            >
              {['Все темы', ...new Set(lessons.map((l) => l.topic))].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <LearningDifficulty value={difficulty} onChange={setDifficulty} />
          <span aria-live="polite">
            Найдено {visible.length} из {lessons.length}
          </span>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="learning-list" ref={listRef}>
          {visible.slice(currentPage * 24, (currentPage + 1) * 24).map((l) => {
            const entry = progress.entries[l.id];
            const stats = lessonStats(l, entry);
            return (
              <article className="learning-row" key={l.id}>
                <a href={lessonLink(l.id)} className="learning-row-link">
                  <span className={'lesson-state-icon' + (stats.finished ? ' finished' : '')}>
                    {stats.finished ? <Check size={20} /> : <BookOpen size={20} />}
                  </span>
                  <span className="learning-row-copy">
                    <strong>{l.title}</strong>
                    <span>{l.summary}</span>
                    <small>
                      {l.topic} · {lessonDifficulty(l)}/5 {difficultyLabels[lessonDifficulty(l)]}
                      {l.challenge ? ' · Самостоятельная проверка' : ''}
                      {stats.review > 0 ? ' · Есть задания для повторения' : ''}
                    </small>
                  </span>
                  <span className="learning-row-meta">
                    <span>{l.minutes} мин.</span>
                    <span>
                      {stats.complete}/{stats.total} шагов
                    </span>
                  </span>
                  <ArrowRight size={18} />
                </a>
                <button
                  className="icon-button"
                  aria-label={`${entry?.favorite ? 'Убрать из избранного' : 'В избранное'}: ${l.title}`}
                  aria-pressed={!!entry?.favorite}
                  onClick={() => {
                    try {
                      setProgress(
                        updateLearning(lessons, (data) => {
                          const value = (data.entries[l.id] ??= emptyLessonProgress(l));
                          value.favorite = !value.favorite;
                        }),
                      );
                      setError('');
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  <Bookmark size={17} fill={entry?.favorite ? 'currentColor' : 'none'} />
                </button>
              </article>
            );
          })}
        </div>
        {pageCount > 1 && (
          <nav className="learning-pagination" aria-label="Страницы уроков">
            <button
              className="secondary"
              disabled={currentPage === 0}
              onClick={() => turnPage(currentPage - 1)}
            >
              Предыдущие уроки
            </button>
            <span aria-live="polite">
              Страница {currentPage + 1} из {pageCount}
            </span>
            <button
              className="secondary"
              disabled={currentPage + 1 === pageCount}
              onClick={() => turnPage(currentPage + 1)}
            >
              Следующие уроки
            </button>
          </nav>
        )}
        {!visible.length && (
          <div className="empty-state">
            <Search size={26} />
            <h3>Подходящих уроков нет</h3>
            <p>Измените тему, статус или поисковый запрос.</p>
            <button
              className="secondary"
              onClick={() => {
                setQuery('');
                setFilter('Все');
                setTopic('Все темы');
                setDifficulty(0);
              }}
            >
              Сбросить фильтры
            </button>
          </div>
        )}
      </section>
      <p className="quiet-note learning-footnote">
        Уроков: {lessons.length}, включая вводные миниуроки. Все задания доступны бесплатно.
        Прогресс сохраняется в этом браузере. У каждого урока есть объяснение, проверяемое задание и
        сохранение результата.
      </p>
    </>
  );
}
