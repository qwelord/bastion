import { useEffect, useState } from 'react';
import type { Match } from '../chess/match';
import type { Color } from '../chess/rules';
export function MatchClock({
  match,
  side,
  setupMinutes,
  yours = false,
}: {
  match: Match;
  side: Color;
  setupMinutes?: number;
  yours?: boolean;
}) {
  const [, tick] = useState(0);
  const active =
    setupMinutes === undefined &&
    !match.paused &&
    !match.game.outcome() &&
    match.game.turn() === side;
  useEffect(() => {
    if (!active || !match.config.minutes) return;
    const timer = setInterval(() => tick((value) => value + 1), 100);
    return () => clearInterval(timer);
  }, [active, match.config.minutes]);
  const minutes = setupMinutes ?? match.config.minutes;
  const ms =
    setupMinutes === undefined ? match.clocks(performance.now())[side] : setupMinutes * 60000;
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  return (
    <span
      aria-label={side === 'w' ? 'Часы белых' : 'Часы чёрных'}
      className={`player-time${yours ? ' yours' : ''}${active ? ' clock-active' : ''}`}
    >
      {minutes ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : '∞'}
    </span>
  );
}
