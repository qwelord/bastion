export const timeGroups = {
  'Пуля': [[1, 0], [1, 1], [2, 1]],
  'Блиц': [[3, 0], [3, 2], [5, 0], [5, 3]],
  'Рапид': [[10, 0], [10, 5], [15, 10], [30, 0]],
  'Классика': [[30, 30], [60, 0], [90, 30]],
} as const;
export function validTime(minutes: number, increment: number) {
  return Number.isFinite(minutes) && minutes >= 0 && minutes <= 180 &&
    Number.isInteger(minutes * 4) && Number.isInteger(increment) && increment >= 0 &&
    increment <= 60 && (minutes > 0 || increment === 0);
}
export function timeLabel(minutes: number, increment: number) {
  return minutes ? `${minutes} + ${increment}` : 'Без часов';
}
export function timeCategory(minutes: number, increment: number) {
  if (!minutes) return 'Без часов';
  const estimate = minutes * 60 + increment * 40;
  return estimate < 180 ? 'Пуля' : estimate < 600 ? 'Блиц' : estimate < 3600 ? 'Рапид' : 'Классика';
}
