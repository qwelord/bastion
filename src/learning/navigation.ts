export const learningAreas = [
  {
    id: 'basics',
    title: 'Основы',
    description: 'Правила, координаты и первые осмысленные ходы',
    tracks: [
      'Первые ходы',
      'Правила и старт',
      'Знакомство с доской',
      'Движение фигур',
      'Особые правила',
    ],
  },
  {
    id: 'tactics',
    title: 'Тактика и расчёт',
    description: 'Замечать угрозы, считать варианты и защищаться',
    tracks: [
      'Тактическая мастерская',
      'Расчёт вариантов',
      'Практическая тактика',
      'Мат и расчёт',
      'Тактическое зрение',
      'Тактика',
      'Расчёт и решения',
      'Защита и расчёт',
      'Матовые конструкции',
    ],
  },
  {
    id: 'openings',
    title: 'Дебюты',
    description: '46 систем, планы обеих сторон и учебные ветки',
    tracks: ['Дебютный атлас', 'Дебют и развитие', 'Начало партии'],
  },
  {
    id: 'strategy',
    title: 'Стратегия',
    description: 'Слабые поля, активность фигур и пешечные структуры',
    tracks: ['Позиционная игра', 'Пешечные структуры', 'Планы и структура', 'Стратегия'],
  },
  {
    id: 'endgames',
    title: 'Окончания',
    description: 'Активный король, проходные и техника ладей',
    tracks: ['Техника окончания', 'Основы окончаний', 'Техника окончаний', 'Окончания', 'Эндшпиль'],
  },
  {
    id: 'practice',
    title: 'Игровая практика',
    description: 'Принятие решений, проверка знаний и работа над ошибками',
    tracks: [
      'Практика игрока',
      'Углублённая практика',
      'Самостоятельная практика',
      'Практическая игра',
      'Практика',
      'Игровые решения',
    ],
  },
] as const;
export type LearningArea = (typeof learningAreas)[number]['id'];
export function areaForTrack(track: string): LearningArea {
  return (
    learningAreas.find((area) => (area.tracks as readonly string[]).includes(track))?.id ??
    'practice'
  );
}
export function learningLocation(hash: string) {
  const [path, query = ''] = hash.split('?');
  const params = new URLSearchParams(query);
  const area = learningAreas.find((a) => a.id === params.get('area'))?.id ?? '';
  const filter =
    new Map([
      ['review', 'Повторить'],
      ['favorite', 'Избранное'],
      ['started', 'В процессе'],
    ]).get(params.get('filter') ?? '') ?? 'Все';
  return { path, area, filter };
}
export const areaLink = (area: string) => `#learn?area=${encodeURIComponent(area)}`;
