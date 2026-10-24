export type Strength = { mode: 'elo' | 'skill' | 'training'; value: number };
export type EngineKind = 'lite' | 'full';
export type Candidate = { move: string; score: number; depth: number };
export const ranges = { elo: [1320, 3190], skill: [0, 20], training: [200, 1300] } as const;
export function normalizeStrength(strength: Strength): Strength {
  const mode = ['elo', 'skill', 'training'].includes(strength.mode) ? strength.mode : 'elo';
  const [min, max] = ranges[mode];
  return {
    mode,
    value: Math.min(
      max,
      Math.max(min, Math.round(Number.isFinite(strength.value) ? strength.value : min)),
    ),
  };
}
export function strengthLabel(s: Strength) {
  return s.mode === 'skill'
    ? `Уровень ${s.value} / 20`
    : s.mode === 'training'
      ? `Учебная сила ${s.value}`
      : `Elo ${s.value}`;
}
export function strengthCommands(input: Strength, legalCount: number) {
  const s = normalizeStrength(input);
  return [
    `setoption name UCI_LimitStrength value ${s.mode === 'elo' ? 'true' : 'false'}`,
    `setoption name UCI_Elo value ${s.mode === 'elo' ? s.value : 1320}`,
    `setoption name Skill Level value ${s.mode === 'skill' ? s.value : 20}`,
    `setoption name MultiPV value ${s.mode === 'training' ? Math.min(legalCount, 256) : 1}`,
  ];
}
// All training candidates are evaluated by Stockfish. This policy is not an Elo calibration.
export function trainingMove(input: Candidate[], strength: number, random = Math.random) {
  const candidates = [...new Map(input.map((c) => [c.move, c])).values()].sort(
    (a, b) => b.score - a.score,
  );
  if (!candidates.length) return null;
  const weakness = (1320 - Math.min(1300, Math.max(200, strength))) / 1120;
  if (random() > weakness * 0.9) return candidates[0].move;
  const targetLoss = 100 + weakness * 900 * (0.5 + random());
  const best = candidates[0].score;
  return candidates.reduce((pick, c) =>
    Math.abs(best - c.score - targetLoss) < Math.abs(best - pick.score - targetLoss) ? c : pick,
  ).move;
}
