import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Search, RotateCcw } from 'lucide-react';
import { Board } from '../components/Board';
import { ChessGame } from '../chess/rules';
import { lessons, difficultyLabels, lessonDifficulty } from '../learning/catalog';
import { LearningDifficulty } from '../components/LearningDifficulty';
import {
  courses,
  courseLessons,
  courseStats,
  courseLink,
  courseForLesson,
  nextCourseLesson,
  type CourseDefinition,
} from '../learning/courses';
import { readLearning, lessonLink, lessonStats, hasOpenAttempt } from '../learning/progress';
import { learningAreas, areaForTrack, areaLink } from '../learning/navigation';
import { useLearningLocation } from '../learning/useLearningLocation';
import type { Settings } from '../state';
function useProgress() {
  const [progress, setProgress] = useState(() => readLearning(lessons));
  useEffect(() => {
    const refresh = () => setProgress(readLearning(lessons));
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  return progress;
}
function Preview({ id, settings }: { id: string; settings: Settings }) {
  const lesson = lessons.find((l) => l.id === id)!;
  return (
    <div className="learning-preview" aria-hidden="true">
      <Board
        settings={{ ...settings, coordinates: false }}
        position={new ChessGame(lesson.steps[0].fen).position()}
      />
    </div>
  );
}
export function CourseCatalog({ settings }: { settings: Settings }) {
  const progress = useProgress();
  const [query, setQuery] = useState('');
  const [track, setTrack] = useState('Все направления');
  const [status, setStatus] = useState('Все');
  const [difficulty, setDifficulty] = useState(0);
  const { area } = useLearningLocation();
  const [page, setPage] = useState(0);
  const catalogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    setTrack('Все направления');
    setPage(0);
  }, [area]);
  useEffect(() => setPage(0), [query, track, status, difficulty]);
  const normalized = useDeferredValue(query.trim().toLocaleLowerCase('ru'));
  const current = courseForLesson(progress.lastLesson);
  const next =
    current &&
    (!courseStats(current, progress).finished ||
      courseLessons(current).some((l) => hasOpenAttempt(l, progress.entries[l.id])))
      ? current
      : (courses.find((c) => !courseStats(c, progress).finished) ?? courses[0]);
  const resume = nextCourseLesson(next, progress);
  const finished = courses.filter((c) => courseStats(c, progress).finished).length;
  const visible = courses.filter((c) => {
    const stats = courseStats(c, progress);
    const searchable = [
      c.title,
      ...(c.aliases ?? []),
      c.outcome,
      c.track,
      ...courseLessons(c).flatMap((l) => [
        l.title,
        l.summary,
        l.objective,
        progress.entries[l.id]?.note ?? '',
      ]),
    ]
      .join(' ')
      .toLocaleLowerCase('ru');
    return (
      (!area || areaForTrack(c.track) === area) &&
      (track === 'Все направления' || c.track === track) &&
      (!difficulty || courseLessons(c).some((l) => lessonDifficulty(l) === difficulty)) &&
      searchable.includes(normalized) &&
      (status === 'Все' ||
        (status === 'В процессе' && stats.visited && !stats.finished) ||
        (status === 'Пройдено' && stats.finished) ||
        (status === 'Повторить' && stats.review > 0) ||
        (status === 'Есть избранное' && stats.favorite))
    );
  });
  const pageCount = Math.max(1, Math.ceil(visible.length / 18));
  const currentPage = Math.min(page, pageCount - 1);
  const paged = visible.slice(currentPage * 18, (currentPage + 1) * 18);
  function turnPage(value: number) {
    setPage(value);
    catalogRef.current?.scrollIntoView({
      block: 'start',
      behavior: settings.motion ? 'smooth' : 'auto',
    });
  }
  const review = lessons.find((l) => lessonStats(l, progress.entries[l.id]).review > 0);
  return (
    <>
      <div className="page-intro">
        <div>
          <h1>Шахматы, которые вы понимаете</h1>
          <p>От первого хода до осмысленного плана. Объяснение, действие на доске, проверка.</p>
        </div>
        <a className="text-button" href="#learn/lessons">
          <BookOpen size={16} />
          Все уроки
        </a>
      </div>
      <nav
        className={'learning-paths' + (area ? ' area-selected' : '')}
        aria-label="Направления школы"
      >
        {learningAreas.map((item) => (
          <a
            key={item.id}
            href={area === item.id ? '#learn' : areaLink(item.id)}
            aria-current={area === item.id ? 'page' : undefined}
          >
            <span className="path-title">
              {item.title}
              <small>{courses.filter((c) => areaForTrack(c.track) === item.id).length}</small>
            </span>
            <span>{item.description}</span>
          </a>
        ))}
      </nav>
      <section className="learning-hero course-hero catalog-resume">
        <div>
          <span className="learning-kicker">
            {courseStats(next, progress).visited ? 'Продолжить курс' : 'Первый курс'}
          </span>
          <h2>{next.title}</h2>
          <p>{next.outcome}</p>
          <p className="quiet-note">
            {next.lessonIds.length} уроков: от объяснения до практики. Можно возвращаться к трудным
            заданиям.
          </p>
          <a className="primary" href={lessonLink(resume.id)}>
            {courseStats(next, progress).visited ? 'Продолжить' : 'Начать курс'}
            <ArrowRight size={17} />
          </a>
          <a className="text-button course-program-link" href={courseLink(next.id)}>
            Посмотреть программу
          </a>
        </div>
        <Preview id={resume.id} settings={settings} />
      </section>
      <div className="learning-overview">
        <span>
          Пройдено{' '}
          <strong>
            {finished} из {courses.length}
          </strong>{' '}
          курсов
        </span>
        <progress max={courses.length} value={finished} aria-label="Пройденные курсы" />
        {review && (
          <a className="text-button" href={lessonLink(review.id) + '?review=1'}>
            <RotateCcw size={15} />
            Повторить трудное
          </a>
        )}
      </div>
      <section
        className="learning-catalog course-catalog"
        ref={catalogRef}
        aria-label="Каталог курсов"
      >
        <div className="section-title">
          <div>
            <h2>
              {learningAreas.find((item) => item.id === area)?.title ?? 'Выберите следующий навык'}
            </h2>
            <p className="quiet-note">
              Курсов: {courses.length}. Уроков: {lessons.length}. Выберите навык под свою задачу.
              Каждый курс открыт сразу.
            </p>
          </div>
        </div>
        <div className="catalog-tools">
          <div className="filter-tabs" aria-label="Статус курса">
            {['Все', 'В процессе', 'Пройдено', 'Повторить', 'Есть избранное'].map((s) => (
              <button key={s} aria-pressed={status === s} onClick={() => setStatus(s)}>
                {s}
              </button>
            ))}
          </div>
          <label className="search-box">
            <Search size={17} />
            <input
              aria-label="Поиск курса"
              placeholder="Тема, навык или заметка"
              maxLength={120}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        <div className="learning-catalog-heading">
          <label>
            Направление
            <select
              aria-label="Направление обучения"
              value={track}
              onChange={(e) => setTrack(e.target.value)}
            >
              {[
                'Все направления',
                ...new Set(
                  courses
                    .filter((c) => !area || areaForTrack(c.track) === area)
                    .map((c) => c.track),
                ),
              ].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <LearningDifficulty value={difficulty} onChange={setDifficulty} />
          <span aria-live="polite">
            Найдено {visible.length} из {courses.length}
          </span>
        </div>
        {[...new Set(paged.map((c) => c.track))].map((t) => (
          <section className="course-track" key={t} aria-label={t}>
            <h3>{t}</h3>
            <div className="learning-list course-grid" key={`${t}-${currentPage}`}>
              {paged
                .filter((c) => c.track === t)
                .map((c) => {
                  const stats = courseStats(c, progress);
                  return (
                    <article className="learning-row" key={c.id}>
                      <a className="learning-row-link" href={courseLink(c.id)}>
                        <span className={'course-sequence' + (stats.finished ? ' finished' : '')}>
                          {stats.finished ? (
                            <Check size={20} />
                          ) : (
                            String(courses.indexOf(c) + 1).padStart(2, '0')
                          )}
                        </span>
                        <span className="learning-row-copy">
                          <strong>{c.title}</strong>
                          <span>{c.outcome}</span>
                          <small>
                            {stats.review
                              ? `${stats.review} заданий для повторения`
                              : stats.finished
                                ? stats.mastered
                                  ? 'Пройден самостоятельно'
                                  : 'Пройден с помощью'
                                : stats.visited
                                  ? 'Курс начат'
                                  : `${c.lessonIds.length} уроков с практикой`}
                          </small>
                        </span>
                        <span className="learning-row-meta">
                          <span>≈ {stats.minutes} мин.</span>
                          <span>
                            {stats.complete}/{c.lessonIds.length} уроков
                          </span>
                          <progress
                            value={stats.steps}
                            max={stats.total}
                            aria-label={`Прогресс: ${c.title}`}
                          />
                        </span>
                        <ArrowRight size={17} />
                      </a>
                    </article>
                  );
                })}
            </div>
          </section>
        ))}
        {pageCount > 1 && (
          <nav className="learning-pagination" aria-label="Страницы курсов">
            <button
              className="secondary"
              disabled={currentPage === 0}
              onClick={() => turnPage(currentPage - 1)}
            >
              Назад
            </button>
            <span aria-live="polite">
              {currentPage * 18 + 1}–{Math.min((currentPage + 1) * 18, visible.length)} из{' '}
              {visible.length} курсов
            </span>
            <button
              className="secondary"
              disabled={currentPage + 1 === pageCount}
              onClick={() => turnPage(currentPage + 1)}
            >
              Дальше
            </button>
          </nav>
        )}
        {!visible.length && (
          <div className="empty-state">
            <Search size={26} />
            <h3>Курсы не найдены</h3>
            <p>Попробуйте другой навык или сбросьте ограничения.</p>
            <button
              className="secondary"
              onClick={() => {
                setQuery('');
                setTrack('Все направления');
                setStatus('Все');
                setDifficulty(0);
                if (area) location.hash = '#learn';
              }}
            >
              Сбросить фильтры
            </button>
          </div>
        )}
      </section>
      <p className="quiet-note learning-footnote">
        Все курсы доступны бесплатно. Сложность 1–5 описывает учебную задачу и не является Elo.
        Прогресс и заметки хранятся в этом браузере. 12 вводных миниуроков доступны в общем списке.
      </p>
    </>
  );
}
export function CourseDetail({
  course,
  settings,
}: {
  course: CourseDefinition;
  settings: Settings;
}) {
  const progress = useProgress();
  const list = courseLessons(course);
  const [difficulty, setDifficulty] = useState(0);
  const stats = courseStats(course, progress);
  const next = nextCourseLesson(course, progress);
  const following = courses[courses.indexOf(course) + 1];
  const review = list.find((l) => lessonStats(l, progress.entries[l.id]).review > 0);
  return (
    <>
      <a className="back-link" href={areaLink(areaForTrack(course.track))}>
        <ArrowLeft size={15} />
        {learningAreas.find((area) => area.id === areaForTrack(course.track))?.title ?? 'Все курсы'}
      </a>
      <div className="page-intro">
        <div>
          <h1>{course.title}</h1>
          <p>{course.track}</p>
        </div>
        <span className="tag">Бесплатно</span>
      </div>
      <section className="learning-hero course-hero">
        <div>
          <h2>{stats.finished ? 'Курс пройден' : 'Чему вы научитесь'}</h2>
          <p>{course.outcome}</p>
          <p className="quiet-note">
            {list.length} уроков, около {stats.minutes} минут. Время ориентировочное: спешить не
            нужно.
          </p>
          <a className="primary" href={lessonLink(next.id)}>
            {stats.finished
              ? 'Открыть первый урок'
              : stats.visited
                ? 'Продолжить курс'
                : 'Начать курс'}
            <ArrowRight size={17} />
          </a>
          {review && (
            <a
              className="text-button course-program-link"
              href={lessonLink(review.id) + '?review=1'}
            >
              Повторить трудные задания
            </a>
          )}
          {stats.finished && (
            <p className="quiet-note">
              {stats.mastered
                ? 'Все шаги выполнены самостоятельно.'
                : 'Часть шагов выполнена с помощью. Попробуйте ещё раз без подсказок.'}
            </p>
          )}
        </div>
        <Preview id={next.id} settings={settings} />
      </section>
      <div className="learning-overview">
        <span>
          Пройдено{' '}
          <strong>
            {stats.complete} из {list.length}
          </strong>{' '}
          уроков
        </span>
        <progress value={stats.steps} max={stats.total} aria-label="Прогресс курса" />
      </div>
      {course.prerequisites.length > 0 && (
        <p className="quiet-note">
          Перед этим пригодится:{' '}
          {course.prerequisites.map((id) => (
            <a key={id} href={courseLink(id)}>
              {courses.find((c) => c.id === id)?.title}
            </a>
          ))}
          . Это рекомендация, курс доступен сразу.
        </p>
      )}
      <section className="course-program" aria-label="Программа курса">
        <div className="course-program-heading">
          <h2>Программа курса</h2>
          <LearningDifficulty value={difficulty} onChange={setDifficulty} />
        </div>
        <p className="quiet-note">
          Сначала основа, затем закрепление и самостоятельные решения. Порядок рекомендательный.
        </p>
        <div className="learning-list">
          {list
            .filter((l) => !difficulty || lessonDifficulty(l) === difficulty)
            .map((l) => {
              const i = list.indexOf(l);
              const result = lessonStats(l, progress.entries[l.id]);
              return (
                <article className="learning-row" key={l.id}>
                  <a className="learning-row-link" href={lessonLink(l.id)}>
                    <span className={'course-sequence' + (result.finished ? ' finished' : '')}>
                      {result.finished ? <Check size={20} /> : i + 1}
                    </span>
                    <span className="learning-row-copy">
                      <strong>{l.title}</strong>
                      <span>{l.summary}</span>
                      <small>
                        <span className="lesson-difficulty">
                          {lessonDifficulty(l)}/5 · {difficultyLabels[lessonDifficulty(l)]}
                        </span>{' '}
                        {l.challenge ? 'Самостоятельная проверка · ' : ''}
                        {result.finished
                          ? result.review
                            ? 'Пройден • стоит повторить'
                            : 'Пройден'
                          : progress.entries[l.id]?.visited
                            ? 'Продолжить с сохранённого шага'
                            : 'Объяснение и проверка'}
                      </small>
                    </span>
                    <span className="learning-row-meta">
                      {result.complete}/{result.total} шагов
                    </span>
                    <ArrowRight size={17} />
                  </a>
                </article>
              );
            })}
        </div>
      </section>
      {difficulty > 0 && !list.some((l) => lessonDifficulty(l) === difficulty) && (
        <p className="empty-state">
          В этом курсе нет уроков выбранной сложности. Выберите другой уровень.
        </p>
      )}
      <section className="course-outcomes">
        <h2>После курса проверьте себя</h2>
        <details>
          <summary>Что проверить после курса</summary>
          <ul>
            {list.map((l) => (
              <li key={l.id}>{l.objective}</li>
            ))}
          </ul>
        </details>
        <p>
          Сформулируйте правило своими словами и попробуйте применить его в партии. К заданиям с
          ошибками можно вернуться через «Повторить трудное».
        </p>
      </section>
      <div className="course-footer">
        {following && (
          <a className="secondary" href={courseLink(following.id)}>
            Дальше: {following.title}
            <ArrowRight size={16} />
          </a>
        )}
        <a className="text-button" href="#play">
          Применить в игре
        </a>
      </div>
    </>
  );
}
