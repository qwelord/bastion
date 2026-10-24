import { useState } from 'react';
import { timeGroups, timeLabel, timeCategory } from '../chess/time';
export function TimeControl({
  minutes,
  increment,
  onChange,
}: {
  minutes: number;
  increment: number;
  onChange: (minutes: number, increment: number) => void;
}) {
  const [group, setGroup] = useState<string>(minutes ? timeCategory(minutes, increment) : 'Свой');
  return (
    <section className="time-control" aria-label="Контроль времени">
      <div className="time-heading">
        <strong>Контроль времени</strong>
        <span>{timeLabel(minutes, increment)}</span>
      </div>
      <div className="time-tabs">
        {[...Object.keys(timeGroups), 'Свой'].map((g) => (
          <button key={g} aria-pressed={g === group} onClick={() => setGroup(g)}>
            {g}
          </button>
        ))}
      </div>
      {group !== 'Свой' ? (
        <div className="time-presets">
          {timeGroups[group as keyof typeof timeGroups].map(([m, i]) => (
            <button
              key={`${m}+${i}`}
              aria-pressed={minutes === m && increment === i}
              onClick={() => onChange(m, i)}
            >
              <strong>
                {m}
                <small> + {i}</small>
              </strong>
              <span>{i ? `${i} сек. за ход` : 'без добавления'}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="custom-time">
          <label htmlFor="minutes">
            Минут на партию <output>{minutes || '∞'}</output>
          </label>
          <input
            id="minutes"
            type="range"
            min="0"
            max="180"
            step="0.25"
            value={minutes}
            onChange={(e) => onChange(+e.target.value, +e.target.value ? increment : 0)}
          />
          <input
            aria-label="Минуты точно"
            type="number"
            min="0"
            max="180"
            step="0.25"
            value={minutes}
            onChange={(e) => {
              const value = Math.max(0, Math.min(180, Math.round(+e.target.value * 4) / 4));
              if (Number.isFinite(value)) onChange(value, value ? increment : 0);
            }}
          />
          <label htmlFor="increment">
            Добавление за ход <output>{increment} сек.</output>
          </label>
          <input
            id="increment"
            type="range"
            min="0"
            max="60"
            value={increment}
            disabled={!minutes}
            onChange={(e) => onChange(minutes, +e.target.value)}
          />
          <input
            aria-label="Добавление точно"
            type="number"
            min="0"
            max="60"
            step="1"
            value={increment}
            disabled={!minutes}
            onChange={(e) => {
              const value = Math.max(0, Math.min(60, Math.round(+e.target.value)));
              if (Number.isFinite(value)) onChange(minutes, value);
            }}
          />
          <button className="text-button" onClick={() => onChange(0, 0)}>
            Играть без часов
          </button>
        </div>
      )}
    </section>
  );
}
