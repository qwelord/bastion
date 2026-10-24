import { useEffect, useState } from 'react';
import { pieceImages } from '../graphics/pieces';
import type { Settings } from '../state';
import { initialPosition, type Position } from '../data/position';
const names: Record<string, string> = {
  p: 'пешка',
  r: 'ладья',
  n: 'конь',
  b: 'слон',
  q: 'ферзь',
  k: 'король',
};
export function Piece({ code, className = '' }: { code: string; className?: string }) {
  const [images, setImages] = useState<Record<string, string>>({});
  useEffect(() => {
    try {
      setImages(pieceImages());
    } catch {
      setImages({});
    }
  }, []);
  return images[code] ? (
    <img
      className={'piece ' + className}
      src={images[code]}
      alt={(code[0] === 'w' ? 'Белые: ' : 'Чёрные: ') + names[code[1]]}
      draggable={false}
    />
  ) : (
    <span className="piece-fallback">{names[code[1]]}</span>
  );
}
export function Board({
  position = initialPosition,
  settings,
  flipped = false,
  highlight = [],
  selected,
  onSquare,
}: {
  position?: Position;
  settings: Settings;
  flipped?: boolean;
  highlight?: string[];
  selected?: string;
  onSquare?: (square: string) => void;
}) {
  const files = flipped ? 'hgfedcba' : 'abcdefgh';
  const ranks = flipped ? '12345678' : '87654321';
  return (
    <div className={'board-frame board-' + settings.board}>
      <div className="chessboard" role="group" aria-label="Шахматная доска">
        {[...ranks].flatMap((rank, row) =>
          [...files].map((file, col) => {
            const square = file + rank;
            const piece = position[square];
            return (
              <button
                key={square}
                className={
                  'square ' +
                  ((row + col) % 2 ? 'dark' : 'light') +
                  (highlight.includes(square) ? ' last-move' : '') +
                  (selected === square ? ' selected' : '')
                }
                onClick={() => onSquare?.(square)}
                tabIndex={onSquare ? 0 : -1}
                aria-label={
                  square +
                  (piece
                    ? ' ' + (piece[0] === 'w' ? 'белая ' : 'чёрная ') + names[piece[1]]
                    : ' пустое поле')
                }
                aria-pressed={onSquare ? selected === square : undefined}
              >
                {settings.coordinates && col === 0 && (
                  <span className="rank-coordinate">{rank}</span>
                )}
                {settings.coordinates && row === 7 && (
                  <span className="file-coordinate">{file}</span>
                )}
                {piece && <Piece code={piece} />}{' '}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
