import { Match, type SavedMatch } from '../chess/match';
export type StoredGame = { id: string; created: number; updated: number; title: string; note: string; favorite: boolean; match: SavedMatch };
const key = 'bastion.games.v1';
export const selectedGameKey = 'bastion.review.selected';
export function readGames(): StoredGame[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw || raw.length > 8_000_000) return [];
    const list: unknown = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.slice(0, 200).flatMap(value => {
      try {
        if (!value || typeof value.id !== 'string' || !/^[\w-]{1,80}$/.test(value.id) || !Number.isFinite(value.created) || !Number.isFinite(value.updated)) return [];
        Match.restore(value.match);
        return [{ id: value.id, created: value.created, updated: value.updated, title: typeof value.title === 'string' ? value.title.slice(0,120) : 'Партия', note: typeof value.note === 'string' ? value.note.slice(0,4000) : '', favorite: value.favorite === true, match: value.match }];
      } catch { return []; }
    });
  } catch { return []; }
}
export function writeGames(games: StoredGame[]) {
  const data = JSON.stringify(games.slice(0, 200));
  if (data.length > 8_000_000) throw new Error('Библиотека заполнена. Удалите ненужные партии.');
  try { localStorage.setItem(key, data); }
  catch { throw new Error('Не удалось сохранить библиотеку. Проверьте свободное место и доступ браузера к хранилищу.'); }
  window.dispatchEvent(new Event('bastion:games'));
}
export function archiveGame(id: string, match: SavedMatch) {
  if (!match.started || !match.pgn.includes('1.')) return;
  const games = readGames();
  const old = games.find(g => g.id === id);
  const now = Date.now();
  const item: StoredGame = { id, created: old?.created ?? now, updated: now, title: old?.title ?? (match.config.opponent === 'local' ? 'За одной доской' : 'Партия со Stockfish'), note: old?.note ?? '', favorite: old?.favorite ?? false, match };
  writeGames([item, ...games.filter(g => g.id !== id)]);
}
export function openReview(id: string) {
  localStorage.setItem(selectedGameKey, id);
  location.hash = 'analysis';
}
