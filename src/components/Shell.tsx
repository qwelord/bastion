import { useEffect, useState } from 'react';
import { readProfile } from '../data/profile';
import { BookOpen, Compass, Settings2, Swords, Palette, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Route } from '../state';
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
            <a
              key={id}
              href={'#' + id}
              aria-label={label}
              className={
                route === id || (id === 'learn' && route === 'lesson')
                  ? 'nav-link active'
                  : 'nav-link'
              }
              aria-current={route === id ? 'page' : undefined}
            >
              <Icon size={20} />
              <span>{label}</span>
            </a>
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
        <main id="main-content" tabIndex={-1} key={route}>
          {children}
        </main>
        <footer className="workspace-footer">
          <span>
            Bastion <span className="footer-version">/ 0.5</span>
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
