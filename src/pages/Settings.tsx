import type { Dispatch, SetStateAction } from 'react';
import { Check, RotateCcw, Eye, Sparkles } from 'lucide-react';
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
  function update<K extends keyof SettingsType>(key: K, value: SettingsType[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
  }
  return (
    <>
      <div className="page-intro">
        <div>
          <h1>Ваша доска. Ваше настроение.</h1>
          <p>Найдите оформление, с которым хочется играть дольше.</p>
        </div>
        <button className="text-button" onClick={() => setSettings(defaults)}>
          <RotateCcw size={15} />
          Сбросить
        </button>
      </div>
      <div className="settings-layout">
        <div className="settings-options">
          <section>
            <h2>Пространство</h2>
            <p className="quiet-note">Тема интерфейса</p>
            <div className="theme-options">
              {[
                ['club', 'Клуб'],
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
          <section>
            <h2>Материал доски</h2>
            <p className="quiet-note">Сочетание светлых и тёмных полей</p>
            <div className="board-options">
              {[
                ['walnut', 'Орех'],
                ['slate', 'Сланец'],
                ['olive', 'Олива'],
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
          <section className="display-options">
            <h2>Детали</h2>
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
            Настройки сохраняются в этом браузере. Набор фигур: авторский Staunton, светлое дерево и
            тёмное дерево.
          </p>
        </div>
        <div className="settings-preview">
          <Board settings={settings} position={demoPosition(10)} />
          <div className="preview-caption">
            <span>Предпросмотр</span>
            <span>Staunton / дерево</span>
          </div>
          <p>
            Читаемая позиция.
            <br />
            <span>Ничего лишнего между вами и игрой.</span>
          </p>
        </div>
      </div>
    </>
  );
}
