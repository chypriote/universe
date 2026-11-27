import { useRef, useState } from 'react';
import type { FocalPoint } from '@/lib/journal';

const clamp = (value: number) => Math.min(100, Math.max(0, value));

/** A frame that crops its Photo like the page does (`object-fit: cover`); with `onCommit`, dragging the Photo moves its focal point. */
export function FocalFrame(props: {
  photo: string;
  focus: FocalPoint;
  className: string;
  disabled?: boolean;
  onCommit?: (focus: FocalPoint) => void;
}) {
  const { photo, focus, className, disabled = false, onCommit } = props;
  const [drag, setDrag] = useState<FocalPoint | null>(null);
  const start = useRef<{ x: number; y: number; focus: FocalPoint } | null>(null);
  const shown = drag ?? focus;

  function move(event: React.PointerEvent<HTMLDivElement>) {
    const origin = start.current;
    const image = event.currentTarget.querySelector('img');
    if (!origin || !image || !image.naturalWidth) return;
    const frame = event.currentTarget.getBoundingClientRect();
    const scale = Math.max(frame.width / image.naturalWidth, frame.height / image.naturalHeight);
    const overflowX = image.naturalWidth * scale - frame.width;
    const overflowY = image.naturalHeight * scale - frame.height;
    // The Photo follows the pointer, so the visible part moves the other way.
    setDrag({
      x:
        overflowX > 0
          ? clamp(origin.focus.x - ((event.clientX - origin.x) / overflowX) * 100)
          : origin.focus.x,
      y:
        overflowY > 0
          ? clamp(origin.focus.y - ((event.clientY - origin.y) / overflowY) * 100)
          : origin.focus.y,
    });
  }

  function end(event: React.PointerEvent<HTMLDivElement>, save: boolean) {
    const moved = drag;
    start.current = null;
    setDrag(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (save && moved) onCommit?.({ x: Math.round(moved.x), y: Math.round(moved.y) });
  }

  const draggable = onCommit !== undefined && !disabled;
  return (
    <div
      className={`${className} select-none overflow-hidden border border-border bg-surface ${draggable ? 'cursor-grab touch-none active:cursor-grabbing' : ''}`}
      onPointerDown={
        draggable
          ? (event) => {
              if (event.pointerType === 'mouse' && event.button !== 0) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              start.current = { x: event.clientX, y: event.clientY, focus: shown };
            }
          : undefined
      }
      onPointerMove={draggable ? move : undefined}
      onPointerUp={draggable ? (event) => end(event, true) : undefined}
      onPointerCancel={draggable ? (event) => end(event, false) : undefined}
    >
      <img
        src={photo}
        alt=""
        draggable={false}
        className="size-full object-cover"
        style={{ objectPosition: `${shown.x}% ${shown.y}%` }}
      />
    </div>
  );
}
