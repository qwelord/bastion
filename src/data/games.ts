import { Match, type SavedMatch } from '../chess/match';
export type StoredGame = {
  id: string;
  created: number;
  updated: number;
  title: string;
  note: string;
  favorite: boolean;
  match: SavedMatch;
};
const key = 'bastion.games.v1';
export const selectedGameKey = 'bastion.review.selected';
export function decodeGames(raw: string, strict = false): StoredGame[] {
  if (raw.length > 8_000_000) throw new Error('Слишком большая библиотека.');
  const list: unknown = JSON.parse(raw);
  if (!Array.isArray(list) || list.length > 200) throw new Error('Неверный формат библиотеки.');
  const valid = list.flatMap((value): StoredGame[] => {
    try {
      if (
        !value ||
        typeof value.id !== 'string' ||
        !/^[\w-]{1,80}$/.test(value.id) ||
        !Number.isFinite(value.created) ||
        !Number.isFinite(value.updated)
      )
        return [];
      const restored = Match.restore(value.match);
      return [
        {
          id: value.id,
          created: value.created,
          updated: value.updated,
          title: typeof value.title === 'string' ? value.title.slice(0, 120) : 'Партия',
          note: typeof value.note === 'string' ? value.note.slice(0, 4000) : '',
          favorite: value.favorite === true,
          match: restored.save(0),
        },
      ];
    } catch {
      return [];
    }
  });
  if (
    strict &&
    (valid.length !== list.length || new Set(valid.map((g) => g.id)).size !== valid.length)
  )
    throw new Error('Копия содержит повреждённые или повторяющиеся партии.');
  return valid;
}
export function readGames(): StoredGame[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw || raw.length > 8_000_000) return [];
    return decodeGames(raw);
  } catch {
    return [];
  }
}
export function writeGames(games: StoredGame[]) {
  const old = localStorage.getItem(key);
  if (old) decodeGames(old, true);
  if (games.length > 200)
    throw new Error(
      'В библиотеке уже 200 партий. Удалите ненужные партии перед добавлением новых.',
    );
  const data = JSON.stringify(games.slice(0, 200));
  if (data.length > 8_000_000) throw new Error('Библиотека заполнена. Удалите ненужные партии.');
  try {
    localStorage.setItem(key, data);
  } catch {
    throw new Error(
      'Не удалось сохранить библиотеку. Проверьте свободное место и доступ браузера к хранилищу.',
    );
  }
  window.dispatchEvent(new Event('bastion:games'));
}
export function archiveGame(id: string, match: SavedMatch) {
  if (!match.started || !Match.restore(match).game.history().length) return;
  const games = readGames();
  const old = games.find((g) => g.id === id);
  const now = Date.now();
  const item: StoredGame = {
    id,
    created: old?.created ?? now,
    updated: now,
    title:
      old?.title ?? (match.config.opponent === 'local' ? 'За одной доской' : 'Партия со Stockfish'),
    note: old?.note ?? '',
    favorite: old?.favorite ?? false,
    match,
  };
  writeGames([item, ...games.filter((g) => g.id !== id)]);
}
export function openReview(id: string) {
  localStorage.setItem(selectedGameKey, id);
  location.hash = 'analysis';
}
