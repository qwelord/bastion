import { normalizeStrength, ranges, type Strength } from '../engine/strength';
export function StrengthControl({
  value,
  onChange,
}: {
  value: Strength;
  onChange: (value: Strength) => void;
}) {
  const [min, max] = ranges[value.mode];
  return (
    <div className="strength-control">
      <label className="field-label" htmlFor="strength-mode">
        Настройка силы
      </label>
      <select
        id="strength-mode"
        value={value.mode}
        onChange={(e) => {
          const mode = e.target.value as Strength['mode'];
          onChange({ mode, value: mode === 'elo' ? 1500 : mode === 'skill' ? 5 : 800 });
        }}
      >
        <option value="training">Учебная сила · 200–1300</option>
        <option value="elo">Elo движка · 1320–3190</option>
        <option value="skill">Уровень Stockfish · 0–20</option>
      </select>
      <div className="strength-number">
        <label htmlFor="strength-value">
          {value.mode === 'elo' ? 'Elo' : value.mode === 'skill' ? 'Уровень' : 'Учебная сила'}
        </label>
        <input
          id="strength-value"
          aria-label="Сила соперника"
          type="number"
          min={min}
          max={max}
          step="1"
          value={value.value}
          onChange={(e) => onChange({ ...value, value: Number(e.target.value) })}
          onBlur={() => onChange(normalizeStrength(value))}
        />
      </div>
      <input
        type="range"
        aria-label="Ползунок силы"
        min={min}
        max={max}
        step="1"
        value={Math.min(max, Math.max(min, value.value))}
        onChange={(e) => onChange({ ...value, value: Number(e.target.value) })}
      />
      <div className="range-labels">
        <span>{min}</span>
        <span>{max}</span>
      </div>
      <p className="quiet-note">
        {value.mode === 'training'
          ? 'Условная сила, не измеренный Elo. Ходы Stockfish дополнительно ослабляются для обучения.'
          : value.mode === 'elo'
            ? 'Штатный UCI_Elo Stockfish. Этот рейтинг не равен рейтингу аккаунта на Chess.com или Lichess.'
            : 'Штатный Skill Level движка. 20 — без искусственного ограничения силы.'}
      </p>
    </div>
  );
}
