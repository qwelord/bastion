import { useEffect, useRef } from 'react';
import type { Move } from 'chess.js';
type Entry = { move: Move; index: number };
export function MoveList({
  moves,
  ply,
  onNavigate,
  empty,
}: {
  moves: Move[];
  ply: number;
  onNavigate: (ply: number) => void;
  empty: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rows = new Map<number, { number: number; w?: Entry; b?: Entry }>();
  moves.forEach((move, index) => {
    const number = Number(move.before.split(' ')[5]);
    const row = rows.get(number) ?? { number };
    row[move.color] = { move, index };
    rows.set(number, row);
  });
  useEffect(() => {
    if (ply === moves.length && ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [moves.length, ply]);
  return (
    <div ref={ref} className="move-list live-moves" aria-label="Запись партии">
      {moves.length ? (
        [...rows.values()].map((row) => (
          <div key={row.number}>
            <span>{row.number}.</span>
            {(['w', 'b'] as const).map((color) => {
              const entry = row[color];
              return entry ? (
                <button
                  key={color}
                  className={ply === entry.index + 1 ? 'active' : ''}
                  aria-current={ply === entry.index + 1 ? 'step' : undefined}
                  onClick={() => onNavigate(entry.index + 1)}
                >
                  {entry.move.san}
                </button>
              ) : (
                <span key={color} />
              );
            })}
          </div>
        ))
      ) : (
        <p className="quiet-note">{empty}</p>
      )}
    </div>
  );
}
