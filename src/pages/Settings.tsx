import { useState } from 'react';
import { readProfile, saveProfile } from '../data/profile';
import { unlockSound, moveSound } from '../chess/sound';
import type { Dispatch, SetStateAction } from 'react';
import { Check, RotateCcw, Eye, Sparkles, Volume2 } from 'lucide-react';
import { Board } from '../components/Board';
import { defaults, type Settings as SettingsType } from '../state';
import { demoPosition } from '../data/demo';
export function Settings({
  settings,
  setSettings,
}: {
  settings: SettingsType;
  setSettings: Dispatch<SetStateAction<SettingsType>>;
}) {
  const [profile, setProfile] = useState(readProfile);
  const [profileError, setProfileError] = useState('');
  function update<K extends keyof SettingsType>(key: K, value: SettingsType[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
  }
  return (
    <>
      <div className="page-intro">
        <div>
          <h1>Оформление</h1>
          <p>Выберите тему, цвет доски и параметры отображения.</p>
        </div>
        <button className="text-button" onClick={() => setSettings(defaults)}>
          <RotateCcw size={15} />
          Сбросить
        </button>
      </div>
      <div className="settings-layout">
        <div className="settings-options">
          <section>
            <h2>Локальный профиль</h2>
            <p className="quiet-note">Имя для ваших партий. Данные хранятся на этом устройстве.</p>
            <label htmlFor="profile-name" className="field-label">
              Имя
            </label>
            <input
              id="profile-name"
              type="text"
              maxLength={40}
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              onBlur={() => {
                try {
                  saveProfile(profile);
                  setProfileError('');
                } catch {
                  setProfileError('Не удалось сохранить имя.');
                }
              }}
            />
            {profileError && <p role="alert">{profileError}</p>}
          </section>
          <section id="appearance-section" tabIndex={-1}>
            <h2>Пространство</h2>
            <p className="quiet-note">Тема интерфейса</p>
            <div className="theme-options">
              {[
                ['club', 'Графит'],
                ['light', 'Светлая'],
                ['evening', 'Вечер'],
              ].map(([id, name]) => (
                <button
                  key={id}
                  aria-pressed={settings.theme === id}
                  onClick={() => update('theme', id as SettingsType['theme'])}
                >
                  <span className={'theme-preview theme-' + id}>
                    <i />
                    <i />
                    <i />
                  </span>
                  <span>
                    {name}
                    {settings.theme === id && <Check size={15} />}
                  </span>
                </button>
              ))}
            </div>
          </section>
          <section id="board-section" tabIndex={-1}>
            <h2>Цвет доски</h2>
            <p className="quiet-note">Сочетание светлых и тёмных полей</p>
            <div className="board-options">
              {[
                ['walnut', 'Классическая'],
                ['slate', 'Серая'],
                ['olive', 'Зелёная'],
              ].map(([id, name]) => (
                <button
                  key={id}
                  aria-pressed={settings.board === id}
                  onClick={() => update('board', id as SettingsType['board'])}
                >
                  <span className={'board-swatch swatch-' + id} />
                  <span>{name}</span>
                  {settings.board === id && <Check size={15} />}
                </button>
              ))}
            </div>
          </section>
          <section id="details-section" tabIndex={-1} className="display-options">
            <h2>Детали</h2>
            <label className="toggle-row">
              <span>
                <Volume2 size={18} />
                <span>
                  Звуки ходов<small>Тихий отклик на ход, взятие и шах</small>
                </span>
              </span>
              <input
                type="checkbox"
                checked={settings.sound}
                onChange={(e) => {
                  update('sound', e.target.checked);
                  if (e.target.checked) {
                    unlockSound();
                    moveSound(false, false, false, settings.volume);
                  }
                }}
              />
            </label>
            {settings.sound && (
              <label className="volume-control">
                Громкость
                <input
                  aria-label="Громкость"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.volume}
                  onChange={(e) => update('volume', +e.target.value)}
                />
              </label>
            )}
            <label className="toggle-row">
              <span>
                <Eye size={18} />
                <span>
                  Координаты доски<small>Буквы и цифры по краям</small>
                </span>
              </span>
              <input
                type="checkbox"
                checked={settings.coordinates}
                onChange={(e) => update('coordinates', e.target.checked)}
              />
            </label>
            <label className="toggle-row">
              <span>
                <Sparkles size={18} />
                <span>
                  Плавные переходы<small>Учитывают настройки вашей системы</small>
                </span>
              </span>
              <input
                type="checkbox"
                checked={settings.motion}
                onChange={(e) => update('motion', e.target.checked)}
              />
            </label>
          </section>
          <p className="quiet-note">
            Настройки сохраняются в этом браузере. Классический набор Cburnett из Lichess.
          </p>
        </div>
        <div className="settings-preview">
          <Board settings={settings} position={demoPosition(10)} />
          <div className="preview-caption">
            <span>Предпросмотр</span>
            <span>Cburnett / Lichess</span>
          </div>
        </div>
      </div>
    </>
  );
}
