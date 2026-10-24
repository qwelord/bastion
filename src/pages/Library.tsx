import { useState } from 'react';
import { Bookmark, Search, ArrowRight, Trash2 } from 'lucide-react';
import { readGames, writeGames, openReview, type StoredGame } from '../data/games';
import { timeLabel } from '../chess/time';
export function Library() {
  const [games, setGames] = useState(readGames);
  const [filter, setFilter] = useState('Все');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [resuming, setResuming] = useState<string>();
  const [deleting, setDeleting] = useState<string>();
  function save(next: StoredGame[]) {
    try {
      writeGames(next);
      setGames(next);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const visible = games.filter(
    (g) =>
      (filter !== 'Избранное' || g.favorite) &&
      (filter !== 'Завершённые' || g.match.outcome) &&
      (filter !== 'В процессе' || !g.match.outcome) &&
      `${g.title} ${g.note}`.toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru')),
  );
  return (
    <>
      <div className="page-intro">
        <div>
          <h1>Библиотека</h1>
          <p>Ваши партии, заметки и позиции для повторения. Сохраняются на этом устройстве.</p>
        </div>
      </div>
      <div className="catalog-tools">
        <div className="filter-tabs">
          {['Все', 'Избранное', 'Завершённые', 'В процессе'].map((f) => (
            <button key={f} aria-pressed={f === filter} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
        <label className="search-box">
          <Search size={17} />
          <input
            aria-label="Поиск партии"
            placeholder="Название или заметка"
            value={query}
            maxLength={120}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="game-library">
        {visible.map((g) => (
          <article className="saved-game surface" key={g.id}>
            <div className="saved-game-heading">
              <span>
                {new Date(g.created).toLocaleDateString('ru')} ·{' '}
                {timeLabel(g.match.config.minutes, g.match.config.increment)}
              </span>
              <button
                className="icon-button"
                aria-label={g.favorite ? 'Убрать из избранного' : 'В избранное'}
                aria-pressed={g.favorite}
                onClick={() =>
                  save(games.map((v) => (v.id === g.id ? { ...v, favorite: !v.favorite } : v)))
                }
              >
                <Bookmark size={18} fill={g.favorite ? 'currentColor' : 'none'} />
              </button>
            </div>
            <input
              className="game-title"
              aria-label="Название партии"
              value={g.title}
              maxLength={120}
              onChange={(e) =>
                setGames(games.map((v) => (v.id === g.id ? { ...v, title: e.target.value } : v)))
              }
              onBlur={() => save(games)}
            />
            <p>
              {g.match.outcome
                ? `${g.match.outcome.result} · ${g.match.outcome.reason}`
                : 'Не завершена'}
            </p>
            <textarea
              aria-label="Заметка к партии"
              placeholder="Что хочется запомнить?"
              maxLength={4000}
              value={g.note}
              onChange={(e) =>
                setGames(games.map((v) => (v.id === g.id ? { ...v, note: e.target.value } : v)))
              }
              onBlur={() => save(games)}
            />
            <div className="saved-game-actions">
              {!g.match.outcome && (
                <button className="text-button" onClick={() => setResuming(g.id)}>
                  Продолжить
                </button>
              )}
              <button className="secondary" onClick={() => openReview(g.id)}>
                Разобрать <ArrowRight size={16} />
              </button>
              <button
                className="icon-button"
                aria-label="Удалить партию"
                onClick={() => setDeleting(g.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
            {resuming === g.id && (
              <div className="delete-confirm">
                <p>Открыть эту партию вместо текущей? Текущая останется в библиотеке.</p>
                <button
                  className="secondary"
                  onClick={() => {
                    try {
                      localStorage.setItem('bastion.match.v1', JSON.stringify(g.match));
                      localStorage.setItem('bastion.match.id', g.id);
                      location.hash = 'play';
                    } catch {
                      setError('Не удалось открыть сохранение.');
                    }
                  }}
                >
                  Открыть
                </button>
                <button className="text-button" onClick={() => setResuming(undefined)}>
                  Отмена
                </button>
              </div>
            )}
            {deleting === g.id && (
              <div className="delete-confirm">
                <p>Удалить партию с этого устройства?</p>
                <button
                  className="secondary"
                  onClick={() => {
                    save(games.filter((v) => v.id !== g.id));
                    setDeleting(undefined);
                  }}
                >
                  Удалить
                </button>
                <button className="text-button" onClick={() => setDeleting(undefined)}>
                  Отмена
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
      {!visible.length && (
        <div className="empty-state surface">
          <Bookmark size={30} />
          <h2>{games.length ? 'Ничего не найдено' : 'Здесь появятся ваши партии'}</h2>
          <p>
            {games.length
              ? 'Измените фильтр или поисковый запрос.'
              : 'Сыграйте хотя бы один ход: партия сохранится автоматически.'}
          </p>
          <a className="primary" href="#play">
            Играть <ArrowRight size={16} />
          </a>
        </div>
      )}
    </>
  );
}
