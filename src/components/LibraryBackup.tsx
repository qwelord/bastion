import { useState } from 'react';
import { decodeGames, readGames, writeGames, type StoredGame } from '../data/games';
export function LibraryBackup() {
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState<StoredGame[] | null>(null);
  function download() {
    try {
      const raw = localStorage.getItem('bastion.games.v1');
      const data = JSON.stringify({
        format: 'bastion-library',
        version: 1,
        games: raw ? decodeGames(raw, true) : [],
      });
      const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `bastion-library-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Копия библиотеки подготовлена. Сохраните файл в надёжном месте.');
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  return (
    <details className="library-backup">
      <summary>Резервная копия библиотеки</summary>
      <p className="quiet-note">
        Необязательно. Позволяет перенести партии, заметки и избранное в другой браузер. Настройки и
        текущие часы не меняются.
      </p>
      <button className="secondary" onClick={download}>
        Сохранить копию
      </button>
      <label className="backup-file">
        Восстановить из копии
        <input
          aria-label="Файл резервной копии"
          type="file"
          accept=".json,application/json"
          onChange={async (e) => {
            const file = e.currentTarget.files?.[0];
            e.currentTarget.value = '';
            setPending(null);
            if (!file) return;
            try {
              if (file.size > 8_000_000) throw new Error('Размер копии превышает 8 МБ.');
              const raw = JSON.parse(await file.text());
              if (raw?.format !== 'bastion-library' || raw.version !== 1)
                throw new Error('Это не копия библиотеки Bastion.');
              setPending(decodeGames(JSON.stringify(raw.games), true));
              setMessage('Копия проверена. Подтвердите добавление партий.');
            } catch (error) {
              setMessage(error instanceof Error ? error.message : 'Не удалось прочитать копию.');
            }
          }}
        />
      </label>
      {pending && (
        <div>
          <p className="quiet-note">
            В копии: {pending.length}. Совпадающие партии сохранят более новую версию.
          </p>
          <button
            className="secondary"
            onClick={() => {
              try {
                const merged = new Map(readGames().map((g) => [g.id, g]));
                for (const game of pending)
                  if (!merged.has(game.id) || merged.get(game.id)!.updated < game.updated)
                    merged.set(game.id, game);
                writeGames([...merged.values()].sort((a, b) => b.updated - a.updated));
                setPending(null);
                setMessage('Библиотека восстановлена.');
              } catch (e) {
                setMessage((e as Error).message);
              }
            }}
          >
            Добавить партии
          </button>
          <button className="text-button" onClick={() => setPending(null)}>
            Отмена
          </button>
        </div>
      )}
      <p role="status" className="quiet-note">
        {message}
      </p>
    </details>
  );
}
