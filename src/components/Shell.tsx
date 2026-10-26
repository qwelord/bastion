import { lazy, Suspense, useEffect, useState } from 'react';
import { readGames } from '../data/games';
import { readProfile } from '../data/profile';
import { BookOpen, Compass, Settings2, Swords, Palette, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Route } from '../state';
const LearningNavigation = lazy(() =>
  import('./LearningNavigation').then((m) => ({ default: m.LearningNavigation })),
);
function SectionNavigation({ route, hash }: { route: Route; hash: string }) {
  if (route === 'learn' || route === 'lesson')
    return (
      <Suspense fallback={<span className="context-loading">Открываем программу…</span>}>
        <LearningNavigation hash={hash} />
      </Suspense>
    );
  const hasReview = route === 'analysis' && readGames().length > 0;
  const items =
    route === 'play'
      ? [
          ['Игровая доска', 'play-board'],
          ['Панель партии', 'match-panel'],
        ]
      : route === 'analysis'
        ? hasReview
          ? [
              ['Доска разбора', 'analysis-board'],
              ['Параметры разбора', 'analysis-panel'],
            ]
          : []
        : [
            ['Имя игрока', 'profile-name'],
            ['Тема интерфейса', 'appearance-section'],
            ['Цвет доски', 'board-section'],
            ['Звук и движение', 'details-section'],
          ];
  return (
    <>
      {items.map(([label, id]) => (
        <button
          className="context-link"
          key={id}
          onClick={() => {
            const target = document.getElementById(id);
            target?.scrollIntoView({
              block: 'center',
              behavior:
                document.documentElement.dataset.motion === 'false' ||
                matchMedia('(prefers-reduced-motion: reduce)').matches
                  ? 'auto'
                  : 'smooth',
            });
            target?.focus({ preventScroll: true });
          }}
        >
          {label}
        </button>
      ))}
      <a className="context-link" href={route === 'play' ? '#learn?area=openings' : '#play'}>
        {route === 'play' ? 'Разобрать дебют' : 'Перейти к игре'}
      </a>
      {route !== 'settings' && (
        <a className="context-link" href="#settings">
          Оформление доски
        </a>
      )}
      {route === 'analysis' && (
        <a className="context-link" href="#learn?area=tactics">
          Практика расчёта
        </a>
      )}
    </>
  );
}
const nav = [
  { id: 'play', label: 'Играть', icon: Swords },
  { id: 'learn', label: 'Обучение', icon: BookOpen },
  { id: 'analysis', label: 'Анализ', icon: Compass },
];
const titles: Record<Route, string> = {
  play: 'Шахматная комната',
  learn: 'Школа Bastion',
  lesson: 'Практика',
  analysis: 'Мастерская анализа',
  settings: 'Оформление',
};
export function Shell({ route, children }: { route: Route; children: ReactNode }) {
  const [hash, setHash] = useState(() => location.hash);
  useEffect(() => {
    const update = () => setHash(location.hash);
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  const [profile, setProfile] = useState(readProfile);
  useEffect(() => {
    const refresh = () => setProfile(readProfile());
    window.addEventListener('bastion:profile', refresh);
    return () => window.removeEventListener('bastion:profile', refresh);
  }, []);
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        Перейти к содержимому
      </a>
      <aside className="sidebar">
        <a className="brand" href="#play" aria-label="Bastion — главная">
          <img src="/favicon.svg" alt="" />
          <span>
            Bastion<span className="brand-sub">Шахматное пространство</span>
          </span>
        </a>
        <nav aria-label="Основная навигация">
          {nav.map(({ id, label, icon: Icon }) => (
            <div className="nav-group" key={id}>
              <a
                href={'#' + id}
                aria-label={label}
                className={
                  route === id || (id === 'learn' && route === 'lesson')
                    ? 'nav-link active'
                    : 'nav-link'
                }
                aria-current={
                  route === id || (id === 'learn' && route === 'lesson') ? 'page' : undefined
                }
              >
                <Icon size={20} />
                <span>{label}</span>
              </a>
              {(route === id || (id === 'learn' && route === 'lesson')) && (
                <div className="context-nav" aria-label={`Переходы: ${label}`}>
                  <SectionNavigation route={route} hash={hash} />
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a
            className={'nav-link ' + (route === 'settings' ? 'active' : '')}
            href="#settings"
            aria-label="Настройки"
          >
            <Settings2 size={19} />
            Настройки
          </a>
          {route === 'settings' && (
            <div className="context-nav">
              <SectionNavigation route={route} hash={hash} />
            </div>
          )}
          <div className="profile">
            <span className="avatar">{profile.charAt(0).toUpperCase()}</span>
            <span>
              {profile}
              <small>Локальный профиль</small>
            </span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>{titles[route]}</span>
          <div className="topbar-right">
            <span className="prototype-badge">Ранняя версия</span>
            <a className="appearance-link" href="#settings" aria-label="Оформление">
              <Palette size={17} />
              <span>Оформление</span>
            </a>
          </div>
        </header>
        <details className="mobile-section-menu" key={`section-menu-${route}`}>
          <summary>В этом разделе</summary>
          <nav
            aria-label="Переходы в разделе"
            onClick={(event) => {
              if ((event.target as HTMLElement).closest('a,button')) {
                event.currentTarget.closest('details')?.removeAttribute('open');
                requestAnimationFrame(() =>
                  document.getElementById('main-content')?.focus({ preventScroll: true }),
                );
              }
            }}
          >
            <SectionNavigation route={route} hash={hash} />
          </nav>
        </details>
        <main id="main-content" tabIndex={-1} key={route}>
          {children}
        </main>
        <footer className="workspace-footer">
          <span>
            Bastion <span className="footer-version">/ 0.7</span>
          </span>
          <span>Локальная игра</span>
          <a href="https://github.com/qwelord/bastion" target="_blank" rel="noreferrer">
            О проекте <ArrowUpRight size={13} />
          </a>
        </footer>
      </div>
    </div>
  );
}
