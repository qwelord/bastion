import { initialPosition, type Position } from './position';
export const moves = [
  ['e2', 'e4', 'e4'],
  ['e7', 'e5', 'e5'],
  ['g1', 'f3', 'Nf3'],
  ['b8', 'c6', 'Nc6'],
  ['f1', 'b5', 'Bb5'],
  ['a7', 'a6', 'a6'],
  ['b5', 'a4', 'Ba4'],
  ['g8', 'f6', 'Nf6'],
  ['e1', 'g1', 'O-O'],
  ['f8', 'e7', 'Be7'],
  ['f1', 'e1', 'Re1'],
  ['b7', 'b5', 'b5'],
  ['a4', 'b3', 'Bb3'],
  ['d7', 'd6', 'd6'],
  ['c2', 'c3', 'c3'],
  ['e8', 'g8', 'O-O'],
];
export function demoPosition(ply: number): Position {
  const p = { ...initialPosition };
  for (let i = 0; i < Math.min(ply, moves.length); i++) {
    const [from, to] = moves[i];
    p[to] = p[from];
    delete p[from];
    if (i === 8) {
      p.f1 = p.h1;
      delete p.h1;
    }
    if (i === 15) {
      p.f8 = p.h8;
      delete p.h8;
    }
  }
  return p;
}
export const exercisePosition: Position = {
  g8: 'bk',
  f7: 'bp',
  g7: 'bp',
  h7: 'bp',
  g1: 'wk',
  f2: 'wp',
  g2: 'wp',
  h2: 'wp',
  e1: 'wr',
};
export const courses = [
  {
    id: 'first',
    title: 'Первые шаги',
    level: 'Основы',
    topic: 'Доска, фигуры и цель игры',
    lessons: 80,
    description:
      'Как устроена доска, как ходят фигуры и почему безопасность короля определяет всю игру.',
  },
  {
    id: 'tactics',
    title: 'Искусство комбинации',
    level: 'Практика',
    topic: 'Вилки, связки и матовые сети',
    lessons: 240,
    description:
      'Учитесь замечать форсирующие ходы и превращать активность фигур в конкретное преимущество.',
  },
  {
    id: 'strategy',
    title: 'Понимать позицию',
    level: 'Практика',
    topic: 'Структуры, слабости и планы',
    lessons: 220,
    description:
      'Оцените пешечную структуру, найдите слабое поле и составьте план на несколько ходов.',
  },
  {
    id: 'endgame',
    title: 'Техника окончания',
    level: 'Практика',
    topic: 'От оппозиции до ладейных окончаний',
    lessons: 220,
    description:
      'Активный король, проходные пешки и точная техника реализации небольшого преимущества.',
  },
  {
    id: 'opening',
    title: 'За пределами дебюта',
    level: 'Мастерство',
    topic: 'Репертуар с пониманием идей',
    lessons: 160,
    description: 'Связывайте первые ходы с типовыми структурами и планами миттельшпиля.',
  },
  {
    id: 'mastery',
    title: 'Глубина решения',
    level: 'Мастерство',
    topic: 'Профилактика и позиционные жертвы',
    lessons: 160,
    description:
      'Находите ресурсы соперника, сравнивайте планы и принимайте решения в сложных позициях.',
  },
];
