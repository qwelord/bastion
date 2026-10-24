import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Piece } from './Board';
import type { Color, Promotion } from '../chess/rules';
function Modal({
  children,
  title,
  onClose,
}: {
  children: ReactNode;
  title: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="game-dialog"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="dialog-heading">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Закрыть окно" onClick={onClose}>
          <X size={19} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function PromotionDialog({
  color,
  onChoose,
  onCancel,
}: {
  color: Color;
  onChoose: (piece: Promotion) => void;
  onCancel: () => void;
}) {
  return (
    <Modal title="Превращение пешки" onClose={onCancel}>
      <p className="quiet-note">Выберите фигуру. Время продолжает идти.</p>
      <div className="promotion-options">
        {(
          [
            ['q', 'ферзя'],
            ['r', 'ладью'],
            ['b', 'слона'],
            ['n', 'коня'],
          ] as const
        ).map(([piece, name]) => (
          <button key={piece} aria-label={'Превратить в ' + name} onClick={() => onChoose(piece)}>
            <Piece code={color + piece} />
          </button>
        ))}
      </div>
    </Modal>
  );
}
