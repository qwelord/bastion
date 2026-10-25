import { useEffect, useState } from 'react';
import { ArrowRight, Bookmark, BookOpen, Check, Search, RotateCcw } from 'lucide-react';
import { Board } from '../components/Board';
import { ChessGame } from '../chess/rules';
import { lessons } from '../learning/catalog';
import {
  readLearning,
  lessonStats,
  lessonLink,
  updateLearning,
  emptyLessonProgress,
  hasOpenAttempt,
} from '../learning/progress';
import type { Settings } from '../state';
export function Learn({ settings }: { settings: Settings }) {
  const [progress, setProgress] = useState(() => readLearning(lessons));
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Все');
  const [topic, setTopic] = useState('Все темы');
  const [error, setError] = useState('');
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
      (topic === 'Все темы' || l.topic === topic) &&
      `${l.title} ${l.summary} ${l.topic} ${l.objective} ${entry?.note ?? ''}`
        .toLocaleLowerCase('ru')
        .includes(query.trim().toLocaleLowerCase('ru')) &&
      (filter === 'Все' ||
        (filter === 'Избранное' && entry?.favorite) ||
        (filter === 'В процессе' && !!entry?.visited && !stats.finished) ||
        (filter === 'Пройдено' && stats.finished) ||
        (filter === 'Повторить' && stats.review > 0))
    );
  });
  return (
    <>
      <div className="page-intro">
        <div>
          <h1>Учиться, делая ходы</h1>
          <p>Короткое объяснение, практика на доске и понятный разбор ответа.</p>
        </div>
        <span className="tag">
          <BookOpen size={14} />
          {lessons.length} уроков доступны
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
            <span>{next.steps.length} шага</span>
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
          <span aria-live="polite">
            Показано {visible.length} из {lessons.length}
          </span>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="learning-list">
          {visible.map((l) => {
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
                      {l.topic} · {l.level}
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
              }}
            >
              Сбросить фильтры
            </button>
          </div>
        )}
      </section>
      <p className="quiet-note learning-footnote">
        Это первые 12 законченных миниуроков новой системы. Большие курсы и библиотека из 1000+
        уроков остаются следующими этапами. Прогресс сохраняется в этом браузере.
      </p>
    </>
  );
}
