import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { AdminPhoto, FocalPoint } from '@/lib/journal';
import { FocalFrame } from './FocalFrame';
import { message, save } from './admin-form';

/** What these pickers need of a Photo: Trip Photos and plan Photos both fit. */
export type Tile = Pick<AdminPhoto, 'id' | 'name' | 'thumb' | 'orientation'>;

// touch-action none keeps the page from scrolling while a Photo is dragged.
const handle = 'cursor-grab touch-manipulation select-none';

function useDndSensors() {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

function Thumb({ photo, className = '' }: { photo: Tile; className?: string }) {
  return <img src={photo.thumb} alt={photo.name} draggable={false} className={`pointer-events-none bg-surface object-cover ${className}`} />;
}

/* Highlight Photos: 4 slots, filled by dragging portrait Photos from the pool. */

function Draggable({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={`${handle} ${isDragging ? 'opacity-40' : ''}`}>
      {children}
    </div>
  );
}

function Droppable({ id, className, children }: { id: string; className: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? 'border-primary' : ''}`}>
      {children}
    </div>
  );
}

type PickProps = {
  /** The API path of the Trip or plan, for example `/api/admin/trips/sichuan`. */
  base: string;
  photos: Tile[];
  onNotice: (text: string) => void;
};

export function Highlights({ base, photos, highlightIds, onNotice }: PickProps & { highlightIds: number[] }) {
  const portraits = photos.filter((photo) => photo.orientation === 'portrait');
  const byId = new Map(portraits.map((photo) => [photo.id, photo]));
  const [slots, setSlots] = useState<(number | null)[]>(() =>
    Array.from({ length: 4 }, (_, index) => (byId.has(highlightIds[index]) ? highlightIds[index] : null)),
  );
  const [active, setActive] = useState<number | null>(null);
  const sensors = useDndSensors();
  const pool = portraits.filter((photo) => !slots.includes(photo.id));

  async function onDragEnd({ active: dragged, over }: DragEndEvent) {
    setActive(null);
    if (!over) return;
    const photoId = Number(String(dragged.id).replace('photo-', ''));
    const from = slots.indexOf(photoId);
    const next = [...slots];
    const target = String(over.id);
    if (target === 'pool') {
      if (from >= 0) next[from] = null;
    } else {
      const to = Number(target.replace('slot-', ''));
      if (from >= 0) next[from] = next[to];
      next[to] = photoId;
    }
    if (next.every((id, index) => id === slots[index])) return;
    const previous = slots;
    setSlots(next);
    const filled = next.filter((id): id is number => id !== null);
    if (filled.length < 4) return onNotice(`${filled.length} of 4 Highlight Photos picked: pick 4 to save`);
    const result = await save('PUT', `${base}/highlights`, { photoIds: filled });
    if (!result.ok) setSlots(previous);
    onNotice(result.ok ? 'Highlight Photos saved' : message(result.error));
  }

  return (
    <section aria-labelledby="highlights-title" className="flex flex-col gap-4">
      <h2 id="highlights-title" className="font-serif text-2xl">Highlight Photos</h2>
      <p className="text-sm text-muted-foreground">Drag 4 portrait Photos into the slots. Drag between slots to reorder.</p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={({ active: dragged }: DragStartEvent) => setActive(Number(String(dragged.id).replace('photo-', '')))}
        onDragEnd={(event) => void onDragEnd(event)}
        onDragCancel={() => setActive(null)}
      >
        <div className="grid grid-cols-4 gap-3">
          {slots.map((photoId, index) => {
            const photo = photoId === null ? undefined : byId.get(photoId);
            return (
              <Droppable key={index} id={`slot-${index}`} className="flex aspect-[3/4] items-center justify-center border border-dashed border-border">
                {photo ? (
                  <Draggable id={`photo-${photo.id}`}>
                    <Thumb photo={photo} className="aspect-[3/4] w-full" />
                  </Draggable>
                ) : (
                  <span className="text-sm text-muted-foreground">{index + 1}</span>
                )}
              </Droppable>
            );
          })}
        </div>
        <Droppable id="pool" className="min-h-24 border border-border p-3">
          <ul className="flex flex-wrap gap-3">
            {pool.map((photo) => (
              <li key={photo.id} className="w-20">
                <Draggable id={`photo-${photo.id}`}>
                  <Thumb photo={photo} className="aspect-[3/4] w-full" />
                </Draggable>
              </li>
            ))}
            {pool.length === 0 && <li className="text-sm text-muted-foreground">No other portrait Photo</li>}
          </ul>
        </Droppable>
        <DragOverlay>{active !== null && byId.get(active) ? <Thumb photo={byId.get(active)!} className="aspect-[3/4] w-24" /> : null}</DragOverlay>
      </DndContext>
    </section>
  );
}

/* The cover: one landscape Photo. */

export function Cover({ base, label, photos, coverId: initialId, coverFocus, onNotice }: PickProps & { label: string; coverId: number | null; coverFocus: FocalPoint }) {
  const [coverId, setCoverId] = useState(initialId);
  const [focus, setFocus] = useState<FocalPoint>(coverFocus);
  const landscapes = photos.filter((photo) => photo.orientation === 'landscape');

  async function pick(photoId: number) {
    const result = await save('PUT', `${base}/cover`, { photoId });
    if (result.ok) {
      setCoverId(photoId);
      setFocus({ x: 50, y: 50 });
    }
    onNotice(result.ok ? `${label} saved` : message(result.error));
  }

  async function reposition(next: FocalPoint) {
    const result = await save('PUT', `${base}/cover-focus`, next);
    if (result.ok) setFocus(next);
    onNotice(result.ok ? `${label} position saved` : message(result.error));
  }

  const cover = landscapes.find((photo) => photo.id === coverId);

  return (
    <section aria-labelledby="cover-title" className="flex flex-col gap-4">
      <h2 id="cover-title" className="font-serif text-2xl">{label}</h2>
      {cover && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Drag the Photo to choose the part the page shows.</p>
          <FocalFrame className="aspect-[21/9] w-full max-w-3xl" photo={cover.thumb} focus={focus} onCommit={(next) => void reposition(next)} />
        </div>
      )}
      <ul className="flex max-h-72 flex-wrap gap-3 overflow-y-auto border border-border p-3">
        {landscapes.map((photo) => (
          <li key={photo.id} className="w-28">
            <button
              type="button"
              aria-pressed={coverId === photo.id}
              aria-label={`Use ${photo.name} as ${label}`}
              className={`block w-full cursor-pointer border-2 ${coverId === photo.id ? 'border-primary' : 'border-transparent'}`}
              onClick={() => void pick(photo.id)}
            >
              <Thumb photo={photo} className="aspect-[4/3] w-full" />
            </button>
          </li>
        ))}
        {landscapes.length === 0 && <li className="text-sm text-muted-foreground">No landscape Photo</li>}
      </ul>
    </section>
  );
}

/* Day Photos: sorted inside a Day and dragged between Days and the tray. */

const TRAY = 'tray';
const dayKey = (id: number) => `day-${id}`;

// Tiles share one height; the width follows the Photo shape.
const SHAPE = { landscape: 'aspect-[4/3]', portrait: 'aspect-[3/4]', square: 'aspect-square' } as const;

function SortablePhoto({ photo, onRemove }: { photo: Tile; onRemove?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={`relative h-24 ${SHAPE[photo.orientation]} ${handle} ${isDragging ? 'opacity-40' : ''}`}
    >
      <Thumb photo={photo} className="size-full" />
      {onRemove && (
        <button
          type="button"
          aria-label={`Take ${photo.name} off the Day`}
          className="absolute right-1 top-1 grid size-5 cursor-pointer place-items-center bg-background/90 text-foreground hover:text-primary"
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          onClick={onRemove}
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      )}
    </li>
  );
}

function PhotoList({ id, photoIds, photos, label, onRemove }: { id: string; photoIds: number[]; photos: Map<number, Tile>; label: string; onRemove?: (photoId: number) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <SortableContext id={id} items={photoIds} strategy={rectSortingStrategy}>
      <ul
        ref={setNodeRef}
        aria-label={label}
        className={`flex min-h-28 flex-wrap gap-3 border p-3 ${isOver ? 'border-primary' : 'border-border'}`}
      >
        {photoIds.map((photoId) => (
          <SortablePhoto key={photoId} photo={photos.get(photoId)!} onRemove={onRemove && (() => onRemove(photoId))} />
        ))}
        {photoIds.length === 0 && <li className="self-center text-sm text-muted-foreground">Drop Photos here</li>}
      </ul>
    </SortableContext>
  );
}

type Board = {
  photos: Tile[];
  days: { id: number; photoIds: number[] }[];
  /** The API path that sets the Photos of a Day. */
  daysUrl: string;
  onNotice: (text: string) => void;
  /** Draws the Days; `list` is the drop zone of one Day. */
  children: (list: (dayId: number, label: string) => ReactNode) => ReactNode;
};

/** The tray of Photos on no Day beside the Days: each drop saves the Day lists it changed. */
export function PhotoBoard({ photos: all, days, daysUrl, onNotice, children }: Board) {
  const photos = new Map(all.map((photo) => [photo.id, photo]));
  const [items, setItems] = useState<Record<string, number[]>>(() => {
    const placed = new Set(days.flatMap((day) => day.photoIds));
    return {
      [TRAY]: all.filter((photo) => !placed.has(photo.id)).map((photo) => photo.id),
      ...Object.fromEntries(days.map((day) => [dayKey(day.id), day.photoIds])),
    };
  });
  const [before, setBefore] = useState(items);
  const [active, setActive] = useState<number | null>(null);
  const sensors = useDndSensors();

  const containerOf = (id: string | number, from = items) =>
    typeof id === 'string' && id in from ? id : Object.keys(from).find((key) => from[key].includes(Number(id)));

  function onDragOver({ active: dragged, over }: DragOverEvent) {
    if (!over) return;
    const source = containerOf(dragged.id);
    const target = containerOf(over.id);
    if (!source || !target || source === target) return;
    setItems((current) => {
      const index = current[target].indexOf(Number(over.id));
      const at = index >= 0 ? index : current[target].length;
      return {
        ...current,
        [source]: current[source].filter((id) => id !== dragged.id),
        [target]: [...current[target].slice(0, at), Number(dragged.id), ...current[target].slice(at)],
      };
    });
  }

  async function onDragEnd({ active: dragged, over }: DragEndEvent) {
    setActive(null);
    let next = items;
    const container = containerOf(dragged.id);
    if (over && container && container === containerOf(over.id)) {
      const from = items[container].indexOf(Number(dragged.id));
      const to = typeof over.id === 'string' ? from : items[container].indexOf(Number(over.id));
      if (to >= 0 && from !== to) {
        next = { ...items, [container]: arrayMove(items[container], from, to) };
        setItems(next);
      }
    }
    // A Photo that joins a Day leaves its old one in the Journal.
    const changed = days.map((day) => dayKey(day.id)).filter((key) => next[key].join() !== before[key].join());
    for (const key of changed) {
      const result = await save('PUT', `${daysUrl}/${key.replace('day-', '')}/photos`, { photoIds: next[key] });
      if (!result.ok) {
        setItems(before);
        return onNotice(message(result.error));
      }
    }
    setBefore(next);
    if (changed.length > 0) onNotice('Photos saved');
  }

  async function takeOff(dayId: number, photoId: number) {
    const key = dayKey(dayId);
    const next = { ...items, [key]: items[key].filter((id) => id !== photoId), [TRAY]: [...items[TRAY], photoId] };
    const result = await save('PUT', `${daysUrl}/${dayId}/photos`, { photoIds: next[key] });
    if (!result.ok) return onNotice(message(result.error));
    setItems(next);
    setBefore(next);
    onNotice('Photo taken off the Day');
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={({ active: dragged }: DragStartEvent) => {
        setBefore(items);
        setActive(Number(dragged.id));
      }}
      onDragOver={onDragOver}
      onDragEnd={(event) => void onDragEnd(event)}
      onDragCancel={() => {
        setItems(before);
        setActive(null);
      }}
    >
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="flex max-h-[calc(100vh-2rem)] flex-col gap-2 overflow-y-auto lg:sticky lg:top-4 lg:col-start-2 lg:row-start-1">
          <h3 className="eyebrow text-muted-foreground">On no Day ({items[TRAY].length})</h3>
          <PhotoList id={TRAY} photoIds={items[TRAY]} photos={photos} label="Photos on no Day" />
        </div>
        <div className="flex flex-col gap-6 lg:col-start-1 lg:row-start-1">
          {children((dayId, label) => (
            <PhotoList id={dayKey(dayId)} photoIds={items[dayKey(dayId)] ?? []} photos={photos} label={label} onRemove={(photoId) => void takeOff(dayId, photoId)} />
          ))}
        </div>
      </div>
      <DragOverlay>{active !== null && photos.get(active) ? <Thumb photo={photos.get(active)!} className={`h-24 ${SHAPE[photos.get(active)!.orientation]}`} /> : null}</DragOverlay>
    </DndContext>
  );
}
