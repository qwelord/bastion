import { useEffect, useState } from 'react';
export type Route = 'play' | 'learn' | 'lesson' | 'analysis' | 'settings';
export type Settings = {
  theme: 'club' | 'light' | 'evening';
  board: 'walnut' | 'slate' | 'olive';
  sound: boolean;
  volume: number;
  motion: boolean;
  coordinates: boolean;
};
export const defaults: Settings = {
  theme: 'club',
  board: 'walnut',
  sound: false,
  volume: 0.5,
  motion: true,
  coordinates: true,
};
export function readSettings(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem('bastion.settings.v1') || '{}');
    return {
      theme: ['club', 'light', 'evening'].includes(s.theme) ? s.theme : defaults.theme,
      board: ['walnut', 'slate', 'olive'].includes(s.board) ? s.board : defaults.board,
      sound: s.sound === true,
      volume: Number.isFinite(s.volume) ? Math.max(0, Math.min(1, s.volume)) : 0.5,
      motion: typeof s.motion === 'boolean' ? s.motion : true,
      coordinates: typeof s.coordinates === 'boolean' ? s.coordinates : true,
    };
  } catch {
    return defaults;
  }
}
export function useSettings() {
  const [settings, setSettings] = useState(readSettings);
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.dataset.motion = String(settings.motion);
    try {
      localStorage.setItem('bastion.settings.v1', JSON.stringify(settings));
    } catch {
      /* Private mode may reject persistence. */
    }
  }, [settings]);
  return [settings, setSettings] as const;
}
export function useRoute() {
  const resolve = (): Route => {
    const r = location.hash.slice(1).split('/')[0].split('?')[0];
    return ['play', 'learn', 'lesson', 'analysis', 'settings'].includes(r) ? (r as Route) : 'play';
  };
  const [route, setRoute] = useState<Route>(resolve);
  useEffect(() => {
    const update = () => {
      setRoute(resolve());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return route;
}
