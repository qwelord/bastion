import { difficultyLabels } from '../learning/catalog';
export function LearningDifficulty({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="difficulty-select">
      Сложность
      <select
        aria-label="Сложность обучения"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {difficultyLabels.map((label, index) => (
          <option key={index} value={index}>
            {index ? `${index}/5 · ${label}` : label}
          </option>
        ))}
      </select>
    </label>
  );
}
