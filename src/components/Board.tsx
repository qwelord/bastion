import type { Settings } from '../state';
import { initialPosition, type Position } from '../data/position';
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type KeyboardEvent,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { DragMotion } from './dragMotion';
const names: Record<string, string> = {
  p: 'пешка',
  r: 'ладья',
  n: 'конь',
  b: 'слон',
  q: 'ферзь',
  k: 'король',
};
export function Piece({
  code,
  className = '',
  style,
}: {
  code: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <img
      className={'piece ' + className}
      src={'/pieces/' + code + '.svg'}
      alt={(code[0] === 'w' ? 'Белые: ' : 'Чёрные: ') + names[code[1]]}
      draggable={false}
      style={style}
    />
  );
}
export function Board({
  position = initialPosition,
  settings,
  flipped = false,
  highlight = [],
  selected,
  onSquare,
  onMove,
  onDragStart,
  movableSquares,
  legalTargets = [],
  checkedSquare,
  emphasis = [],
  markedSquares,
}: {
  position?: Position;
  settings: Settings;
  flipped?: boolean;
  highlight?: string[];
  selected?: string;
  onSquare?: (square: string) => void;
  onMove?: (from: string, to: string) => void;
  onDragStart?: (from: string) => void;
  movableSquares?: string[];
  legalTargets?: string[];
  checkedSquare?: string;
  emphasis?: string[];
  markedSquares?: string[];
}) {
  const files = flipped ? 'hgfedcba' : 'abcdefgh';
  const ranks = flipped ? '12345678' : '87654321';
  const [focusedSquare, setFocusedSquare] = useState(
    movableSquares?.[0] ?? (flipped ? 'e7' : 'e2'),
  );
  const boardRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const overRef = useRef<HTMLElement | null>(null);
  const gesture = useRef<{
    from: string;
    code: string;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    size: number;
    capture: HTMLElement;
    pointerId: number;
    active: boolean;
    rect: DOMRect;
    files: string;
    ranks: string;
    cells: Map<string, HTMLElement>;
  } | null>(null);
  const suppressClick = useRef(false);
  const lastDrag = useRef('');
  const highlightKey = highlight.join('');
  useEffect(() => {
    if (lastDrag.current !== highlightKey) lastDrag.current = '';
  }, [highlightKey]);
  const [drag, setDrag] = useState<{
    from: string;
    code: string;
    size: number;
  } | null>(null);
  const [motion] = useState(
    () =>
      new DragMotion(({ x, y }) => {
        const g = gesture.current;
        if (!g) return;
        if (ghostRef.current)
          ghostRef.current.style.transform = `translate3d(${x - g.offsetX}px, ${y - g.offsetY}px, 0)`;
        const square = squareAt(x, y, g.rect, g.files, g.ranks);
        const next = square ? (g.cells.get(square) ?? null) : null;
        if (next !== overRef.current) {
          overRef.current?.classList.remove('drop-target');
          next?.classList.add('drop-target');
          overRef.current = next;
        }
      }),
  );
  function cancelDrag() {
    const g = gesture.current;
    gesture.current = null;
    motion.cancel();
    overRef.current?.classList.remove('drop-target');
    overRef.current = null;
    if (g?.capture.hasPointerCapture(g.pointerId)) g.capture.releasePointerCapture(g.pointerId);
    setDrag(null);
  }
  const positionKey = JSON.stringify(position);
  useEffect(() => {
    cancelDrag();
  }, [positionKey, flipped, !!onMove]);
  useEffect(() => {
    window.addEventListener('blur', cancelDrag);
    window.addEventListener('resize', cancelDrag);
    window.addEventListener('scroll', cancelDrag, true);
    return () => {
      window.removeEventListener('blur', cancelDrag);
      window.removeEventListener('resize', cancelDrag);
      window.removeEventListener('scroll', cancelDrag, true);
      motion.cancel();
      const g = gesture.current;
      gesture.current = null;
      if (g?.capture.hasPointerCapture(g.pointerId)) g.capture.releasePointerCapture(g.pointerId);
    };
  }, [motion]);
  function squareAt(x: number, y: number, rect: DOMRect, boardFiles: string, boardRanks: string) {
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) return undefined;
    return (
      boardFiles[Math.floor(((x - rect.left) / rect.width) * 8)] +
      boardRanks[Math.floor(((y - rect.top) / rect.height) * 8)]
    );
  }
  function down(event: PointerEvent<HTMLButtonElement>, square: string) {
    if (
      event.button !== 0 ||
      !event.isPrimary ||
      gesture.current ||
      !onMove ||
      !position[square] ||
      (movableSquares && !movableSquares.includes(square))
    )
      return;
    const rect = event.currentTarget.getBoundingClientRect();
    gesture.current = {
      from: square,
      code: position[square],
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      size: rect.width,
      capture: event.currentTarget,
      pointerId: event.pointerId,
      active: false,
      rect: boardRef.current!.getBoundingClientRect(),
      files,
      ranks,
      cells: new Map(
        Array.from(boardRef.current!.querySelectorAll<HTMLElement>('[data-square]')).map((cell) => [
          cell.dataset.square!,
          cell,
        ]),
      ),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moving(event: PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || g.pointerId !== event.pointerId) return;
    if (!g.active && Math.hypot(event.clientX - g.startX, event.clientY - g.startY) < 5) return;
    if (!g.active) {
      g.active = true;
      onDragStart?.(g.from);
      setDrag({ from: g.from, code: g.code, size: g.size });
    }
    event.preventDefault();
    motion.move(event.clientX, event.clientY);
  }
  function end(event: PointerEvent<HTMLDivElement>, cancel = false) {
    const g = gesture.current;
    if (!g || g.pointerId !== event.pointerId) return;
    cancelDrag();
    if (g.active) {
      suppressClick.current = true;
      setTimeout(() => {
        suppressClick.current = false;
      }, 0);
      const to = squareAt(event.clientX, event.clientY, g.rect, g.files, g.ranks);
      if (!cancel && to && to !== g.from) {
        lastDrag.current = g.from + to;
        onMove?.(g.from, to);
      }
    }
  }
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    const directions: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -8,
      ArrowDown: 8,
    };
    if (!(event.key in directions)) return;
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-square]');
    if (!button) return;
    const buttons = Array.from(
      boardRef.current!.querySelectorAll<HTMLButtonElement>('[data-square]'),
    );
    const index = buttons.indexOf(button);
    const next = index + directions[event.key];
    if (
      next < 0 ||
      next >= 64 ||
      (event.key === 'ArrowLeft' && index % 8 === 0) ||
      (event.key === 'ArrowRight' && index % 8 === 7)
    )
      return;
    event.preventDefault();
    buttons[next].focus();
  }
  return (
    <div
      className={
        'board-layout board-' + settings.board + (settings.coordinates ? ' with-coordinates' : '')
      }
    >
      {settings.coordinates && (
        <div className="rank-rail" aria-hidden="true">
          {[...ranks].map((rank) => (
            <span key={rank}>{rank}</span>
          ))}
        </div>
      )}
      <div className="board-frame">
        <div
          ref={boardRef}
          className="chessboard"
          role="group"
          aria-label="Шахматная доска"
          onPointerMove={moving}
          onPointerUp={(event) => end(event)}
          onPointerCancel={(event) => end(event, true)}
          onLostPointerCapture={(event) => end(event, true)}
          onKeyDown={keyboard}
        >
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
                    (selected === square ? ' selected' : '') +
                    (emphasis.includes(square) ? ' lesson-emphasis' : '') +
                    (markedSquares?.includes(square) ? ' lesson-marked' : '') +
                    (drag?.from === square ? ' drag-source' : '') +
                    (checkedSquare === square ? ' in-check' : '')
                  }
                  data-square={square}
                  data-movable={
                    !!onMove && !!piece && (!movableSquares || movableSquares.includes(square))
                  }
                  onPointerDown={(event) => down(event, square)}
                  onClick={() => {
                    if (!suppressClick.current) onSquare?.(square);
                  }}
                  tabIndex={onSquare && square === focusedSquare ? 0 : -1}
                  onFocus={() => setFocusedSquare(square)}
                  aria-disabled={!onSquare && !onMove}
                  aria-label={
                    square +
                    (piece
                      ? ' ' +
                        (piece[0] === 'w'
                          ? ['p', 'r'].includes(piece[1])
                            ? 'белая '
                            : 'белый '
                          : ['p', 'r'].includes(piece[1])
                            ? 'чёрная '
                            : 'чёрный ') +
                        names[piece[1]]
                      : ' пустое поле')
                  }
                  aria-pressed={
                    onSquare
                      ? markedSquares
                        ? markedSquares.includes(square)
                        : selected === square
                      : undefined
                  }
                >
                  {piece && (
                    <Piece
                      key={square === highlight[1] ? highlightKey + piece : piece}
                      code={piece}
                      className={
                        square === highlight[1] && lastDrag.current !== highlightKey
                          ? 'piece-arrival'
                          : ''
                      }
                      style={
                        highlight[0]
                          ? ({
                              '--from-x': `${(files.indexOf(highlight[0][0]) - col) * 100}%`,
                              '--from-y': `${(ranks.indexOf(highlight[0][1]) - row) * 100}%`,
                            } as CSSProperties)
                          : undefined
                      }
                    />
                  )}
                  {legalTargets.includes(square) && (
                    <span className={piece ? 'legal-target capture-target' : 'legal-target'} />
                  )}
                </button>
              );
            }),
          )}
        </div>
      </div>
      {settings.coordinates && (
        <div className="file-rail" aria-hidden="true">
          {[...files].map((file) => (
            <span key={file}>{file.toUpperCase()}</span>
          ))}
        </div>
      )}
      {drag &&
        createPortal(
          <div
            className="drag-piece"
            ref={(node) => {
              ghostRef.current = node;
              if (node) motion.flush();
            }}
            aria-hidden="true"
            style={{ width: drag.size, height: drag.size }}
          >
            <Piece code={drag.code} />
          </div>,
          document.body,
        )}
    </div>
  );
}
