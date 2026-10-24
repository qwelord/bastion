import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Search, Clock3, BookOpen, X, Check } from 'lucide-react';
import { Board, Piece } from '../components/Board';
import { courses, exercisePosition } from '../data/demo';
import type { Settings } from '../state';
export function Learn({ settings }: { settings: Settings }) {
  const [level, setLevel] = useState('Все');
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<string>();
  const detailRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (detail) {
      detailRef.current?.focus({ preventScroll: true });
      detailRef.current?.scrollIntoView({ block: 'center' });
    }
  }, [detail]);
  const shown = courses.filter(
    (c) =>
      (level === 'Все' || c.level === level) &&
      (c.title + ' ' + c.topic).toLowerCase().includes(query.toLowerCase()),
  );
  const course = courses.find((c) => c.id === detail);
  return (
    <>
      <div className="page-intro">
        <div>
          <h1>Понимать. Пробовать. Играть.</h1>
          <p>От первого хода до решений, которые меняют партию.</p>
        </div>
        <span className="tag">
          <BookOpen size={14} /> Школа Bastion
        </span>
      </div>
      <section className="featured-lesson">
        <div className="featured-copy">
          <span className="featured-label">Открытый урок</span>
          <h2>Мат на последней горизонтали</h2>
          <p>
            Найдите мат в один ход и разберитесь, почему собственные пешки иногда мешают защитить
            короля.
          </p>
          <div className="featured-meta">
            <span>
              <Clock3 size={14} /> 5 минут
            </span>
            <span>Основы тактики</span>
          </div>
          <a href="#lesson" className="primary">
            Начать урок <ArrowRight size={17} />
          </a>
        </div>
        <div className="featured-position" aria-hidden="true">
          <Board settings={{ ...settings, coordinates: false }} position={exercisePosition} />
          <span>Ход белых · Мат в один ход</span>
        </div>
      </section>
      <section className="curriculum">
        <div className="section-title">
          <div>
            <h2>Программа обучения</h2>
            <p className="quiet-note">
              План библиотеки: 1 080 уроков. Сейчас доступен один демонстрационный урок.
            </p>
          </div>
        </div>
        <div className="catalog-tools">
          <div className="filter-tabs" aria-label="Уровень курса">
            {['Все', 'Основы', 'Практика', 'Мастерство'].map((l) => (
              <button key={l} aria-pressed={level === l} onClick={() => setLevel(l)}>
                {l}
              </button>
            ))}
          </div>
          <label className="search-box">
            <Search size={17} />
            <input
              aria-label="Поиск курса"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Найти тему"
            />
          </label>
        </div>
        <div className="course-list">
          {shown.map((c) => (
            <button
              id={'course-' + c.id}
              className="course-row"
              key={c.id}
              aria-expanded={detail === c.id}
              aria-controls={detail === c.id ? 'course-description' : undefined}
              onClick={() => setDetail(c.id)}
            >
              <span className={'course-mark mark-' + c.id}>
                <Piece code={['wp', 'wn', 'wb', 'wr', 'wq', 'wk'][courses.indexOf(c)]} />
              </span>
              <span className="course-info">
                <span className="course-title">{c.title}</span>
                <span className="course-topic">{c.topic}</span>
              </span>
              <span className="course-level">{c.level}</span>
              <span className="course-count">
                {c.lessons} уроков <small>в плане</small>
              </span>
              <ArrowRight size={18} />
            </button>
          ))}
        </div>
        {!shown.length && (
          <div className="empty-state">
            <Search size={28} />
            <h3>Такой темы пока нет</h3>
            <p>Попробуйте другое слово или сбросьте фильтры.</p>
            <button
              className="secondary"
              onClick={() => {
                setLevel('Все');
                setQuery('');
              }}
            >
              Сбросить фильтры
            </button>
          </div>
        )}
      </section>
      {course && (
        <div
          ref={detailRef}
          id="course-description"
          tabIndex={-1}
          className="course-detail surface"
          role="region"
          aria-label="Описание курса"
        >
          <button
            className="icon-button close-detail"
            onClick={() => {
              setDetail(undefined);
              document.getElementById('course-' + course.id)?.focus();
            }}
            aria-label="Закрыть описание курса"
          >
            <X size={18} />
          </button>
          <span className="tag">{course.level}</span>
          <h2>{course.title}</h2>
          <p>{course.description}</p>
          <p className="quiet-note">
            <Check size={14} /> Раздел включён в план разработки. Полный курс пока недоступен.
          </p>
          <a className="primary" href="#lesson">
            Попробовать открытый урок <ArrowRight size={16} />
          </a>
        </div>
      )}
    </>
  );
}
