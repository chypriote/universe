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
import { useState } from 'react';
import type { AdminCity, AdminDay, AdminPhoto, AdminTripDetail, FocalPoint } from '@/lib/journal';
import { FocalFrame } from './FocalFrame';
import { Toast } from './Toast';

type Props = { trip: AdminTripDetail; cities: AdminCity[] };

const MESSAGES: Record<string, string> = {
  'not-landscape': 'The Trip Cover must be a landscape Photo',
  'not-portrait': 'A Highlight Photo must be a portrait Photo',
  'wrong-count': 'There must be 4 Highlight Photos',
  'duplicate-photo': 'A Photo can be picked once only',
  'unknown-photo': 'A Photo is not in this Trip: reload the page',
  'no-cover': 'The Trip has no Trip Cover: pick one first',
  'invalid-focus': 'That position is not valid',
  'unknown-day': 'The Day no longer exists: reload the page',
  'unknown-city': 'Unknown City',
  'main-not-on-route': 'The main City must be one of the Cities of the Day',
  'invalid-title': 'A Day needs a title',
};
const message = (error = '') => MESSAGES[error] ?? error ?? 'Not saved';

async function save(method: string, url: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await response.json();
  } catch {
    return { ok: false, error: 'The request failed' };
  }
}

const field = 'border border-border bg-surface px-3 py-2 text-sm text-foreground';
const button = 'btn btn-outline cursor-pointer !px-4 !py-2 disabled:cursor-not-allowed disabled:opacity-40';
// touch-action none keeps the page from scrolling while a Photo is dragged.
const handle = 'cursor-grab touch-manipulation select-none';

function useDndSensors() {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

function Thumb({ photo, className = '' }: { photo: AdminPhoto; className?: string }) {
  return <img src={photo.thumb} alt={photo.name} draggable={false} className={`pointer-events-none bg-surface object-cover ${className}`} />;
}

/* Highlight Photos: 4 slots, filled by dragging portrait Photos from the pool. */

function Draggable({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={`${handle} ${isDragging ? 'opacity-40' : ''}`}>
      {children}
    </div>
  );
}

function Droppable({ id, className, children }: { id: string; className: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? 'border-primary' : ''}`}>
      {children}
    </div>
  );
}

function Highlights({ trip, onNotice }: { trip: AdminTripDetail; onNotice: (text: string) => void }) {
  const portraits = trip.photos.filter((photo) => photo.orientation === 'portrait');
  const byId = new Map(portraits.map((photo) => [photo.id, photo]));
  const [slots, setSlots] = useState<(number | null)[]>(() =>
    Array.from({ length: 4 }, (_, index) => (byId.has(trip.highlightIds[index]) ? trip.highlightIds[index] : null)),
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
    const result = await save('PUT', `/api/admin/trips/${encodeURIComponent(trip.slug)}/highlights`, { photoIds: filled });
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

/* Trip Cover: one landscape Photo. */

function Cover({ trip, onNotice }: { trip: AdminTripDetail; onNotice: (text: string) => void }) {
  const [coverId, setCoverId] = useState(trip.coverId);
  const [focus, setFocus] = useState<FocalPoint>(trip.coverFocus);
  const landscapes = trip.photos.filter((photo) => photo.orientation === 'landscape');

  async function pick(photoId: number) {
    const result = await save('PUT', `/api/admin/trips/${encodeURIComponent(trip.slug)}/cover`, { photoId });
    if (result.ok) {
      setCoverId(photoId);
      setFocus({ x: 50, y: 50 });
    }
    onNotice(result.ok ? 'Trip Cover saved' : message(result.error));
  }

  async function reposition(next: FocalPoint) {
    const result = await save('PUT', `/api/admin/trips/${encodeURIComponent(trip.slug)}/cover-focus`, next);
    if (result.ok) setFocus(next);
    onNotice(result.ok ? 'Trip Cover position saved' : message(result.error));
  }

  const cover = landscapes.find((photo) => photo.id === coverId);

  return (
    <section aria-labelledby="cover-title" className="flex flex-col gap-4">
      <h2 id="cover-title" className="font-serif text-2xl">Trip Cover</h2>
      {cover && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Drag the Photo to choose the part the Trip page shows.</p>
          <FocalFrame className="aspect-[21/9] w-full max-w-3xl" photo={cover.thumb} focus={focus} onCommit={(next) => void reposition(next)} />
        </div>
      )}
      <ul className="flex max-h-72 flex-wrap gap-3 overflow-y-auto border border-border p-3">
        {landscapes.map((photo) => (
          <li key={photo.id} className="w-28">
            <button
              type="button"
              aria-pressed={coverId === photo.id}
              aria-label={`Use ${photo.name} as Trip Cover`}
              className={`block w-full cursor-pointer border-2 ${coverId === photo.id ? 'border-primary' : 'border-transparent'}`}
              onClick={() => void pick(photo.id)}
            >
              <Thumb photo={photo} className="aspect-[4/3] w-full" />
            </button>
          </li>
        ))}
        {landscapes.length === 0 && <li className="text-sm text-muted-foreground">No landscape Photo in this Trip</li>}
      </ul>
    </section>
  );
}

/* Days: Photos are sorted inside a Day and dragged between Days and the tray. */

const TRAY = 'tray';
const dayKey = (id: number) => `day-${id}`;

// Tiles share one height; the width follows the Photo shape.
const SHAPE = { landscape: 'aspect-[4/3]', portrait: 'aspect-[3/4]', square: 'aspect-square' } as const;

function SortablePhoto({ photo, onRemove }: { photo: AdminPhoto; onRemove?: () => void }) {
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

function PhotoList({ id, photoIds, photos, label, dim = false, onRemove }: { id: string; photoIds: number[]; photos: Map<number, AdminPhoto>; label: string; dim?: boolean; onRemove?: (photoId: number) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <SortableContext id={id} items={photoIds} strategy={rectSortingStrategy}>
      <ul
        ref={setNodeRef}
        aria-label={label}
        className={`flex min-h-28 flex-wrap gap-3 border p-3 ${isOver ? 'border-primary' : 'border-border'} ${dim ? 'opacity-60' : ''}`}
      >
        {photoIds.map((photoId) => (
          <SortablePhoto key={photoId} photo={photos.get(photoId)!} onRemove={onRemove && (() => onRemove(photoId))} />
        ))}
        {photoIds.length === 0 && <li className="self-center text-sm text-muted-foreground">Drop Photos here</li>}
      </ul>
    </SortableContext>
  );
}

function DayText({ day, cities, onChange, onNotice, onToggle }: { day: AdminDay; cities: AdminCity[]; onChange: (patch: Partial<AdminDay>) => void; onNotice: (text: string) => void; onToggle: () => void }) {
  const [title, setTitle] = useState(day.title);
  const [notes, setNotes] = useState(day.notes);
  const initial = day.route.length > 0 ? day.route.map((city) => String(city.id)) : [String(day.city.id)];
  // The Cities of the Day in travel order, the last being where it ends, and which one is the main City.
  const [rows, setRows] = useState(initial);
  const [mainAt, setMainAt] = useState(Math.max(0, initial.indexOf(String(day.city.id))));
  const dirty =
    title !== day.title ||
    notes !== day.notes ||
    rows.join() !== initial.join() ||
    Number(rows[mainAt]) !== day.city.id;

  async function saveText() {
    const cityId = Number(rows[mainAt]);
    const result = await save('PATCH', `/api/admin/days/${day.id}`, {
      title,
      notes,
      cityId,
      routeCityIds: rows.length > 1 ? rows.map(Number) : [],
    });
    if (result.ok) {
      const city = cities.find((candidate) => candidate.id === cityId)!;
      onChange({
        title: title.trim(),
        notes,
        city: { id: city.id, name: city.name },
        route: rows.length > 1 ? rows.map((id) => ({ id: Number(id), name: cities.find((candidate) => candidate.id === Number(id))!.name })) : [],
        province: city.province,
      });
    }
    onNotice(result.ok ? `Day of ${day.date} saved` : message(result.error));
  }

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-serif text-xl">
          {day.number === null ? 'Hidden' : `Day ${day.number}`} · {day.date} · {(day.route.length > 0 ? day.route : [day.city]).map((city) => city.name).join(' → ')}, {day.province}
        </h3>
        <div className="flex gap-3">
          <button type="button" className={button} disabled={!dirty} onClick={() => void saveText()}>
            Save day
          </button>
          <button type="button" role="switch" aria-checked={day.visible} aria-label={`Day of ${day.date} on`} className={button} onClick={onToggle}>
            {day.visible ? 'Switch off' : 'Switch on'}
          </button>
        </div>
      </header>
    <div className="flex flex-col gap-3">
      <input className={field} aria-label={`Title of ${day.date}`} value={title} onChange={(event) => setTitle(event.target.value)} />
      {rows.map((id, index) => (
        <div key={index} className="flex flex-wrap items-center gap-3">
          <select
            className={`${field} min-w-48 flex-1`}
            aria-label={`City ${index + 1} of ${day.date}${index === rows.length - 1 && rows.length > 1 ? ', where the Day ends' : ''}`}
            value={id}
            onChange={(event) => setRows(rows.map((value, i) => (i === index ? event.target.value : value)))}
          >
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name} ({city.province})
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name={`main-${day.id}`} checked={mainAt === index} onChange={() => setMainAt(index)} />
            Main City
          </label>
          <button
            type="button"
            className={button}
            disabled={rows.length === 1 || mainAt === index}
            onClick={() => {
              setRows(rows.filter((_, i) => i !== index));
              if (index < mainAt) setMainAt(mainAt - 1);
            }}
          >
            Remove
          </button>
        </div>
      ))}
      <button type="button" className={`${button} self-start`} onClick={() => setRows([...rows, rows.at(-1)!])}>
        Add a City
      </button>
      <textarea className={`${field} min-h-24`} aria-label={`Notes of ${day.date}`} value={notes} onChange={(event) => setNotes(event.target.value)} />
    </div>
    </>
  );
}

function Days({ trip, cities, onNotice }: { trip: AdminTripDetail; cities: AdminCity[]; onNotice: (text: string) => void }) {
  const [days, setDays] = useState(trip.days);
  const photos = new Map(trip.photos.map((photo) => [photo.id, photo]));
  const [items, setItems] = useState<Record<string, number[]>>(() => {
    const placed = new Set(trip.days.flatMap((day) => day.photoIds));
    return {
      [TRAY]: trip.photos.filter((photo) => !placed.has(photo.id)).map((photo) => photo.id),
      ...Object.fromEntries(trip.days.map((day) => [dayKey(day.id), day.photoIds])),
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
    // Each drop saves the Day lists it changed; a Photo that joins a Day leaves its old one in the Journal.
    const changed = days.map((day) => dayKey(day.id)).filter((key) => next[key].join() !== before[key].join());
    for (const key of changed) {
      const result = await save('PUT', `/api/admin/days/${key.replace('day-', '')}/photos`, { photoIds: next[key] });
      if (!result.ok) {
        setItems(before);
        return onNotice(message(result.error));
      }
    }
    setBefore(next);
    if (changed.length > 0) onNotice('Photos saved');
  }

  async function takeOff(day: AdminDay, photoId: number) {
    const key = dayKey(day.id);
    const next = { ...items, [key]: items[key].filter((id) => id !== photoId), [TRAY]: [...items[TRAY], photoId] };
    const result = await save('PUT', `/api/admin/days/${day.id}/photos`, { photoIds: next[key] });
    if (!result.ok) return onNotice(message(result.error));
    setItems(next);
    setBefore(next);
    onNotice('Photo taken off the Day');
  }

  async function toggle(day: AdminDay) {
    const result = await save('PATCH', `/api/admin/days/${day.id}`, { visible: !day.visible });
    if (!result.ok) return onNotice(message(result.error));
    setDays((current) => {
      let number = 0;
      return current.map((item) => {
        const visible = item.id === day.id ? !day.visible : item.visible;
        return { ...item, visible, number: visible ? ++number : null };
      });
    });
    onNotice(day.visible ? `Day of ${day.date} is off` : `Day of ${day.date} is on`);
  }

  const patchDay = (id: number, patch: Partial<AdminDay>) =>
    setDays((current) => current.map((day) => (day.id === id ? { ...day, ...patch } : day)));

  return (
    <section aria-labelledby="days-title" className="flex flex-col gap-6">
      <h2 id="days-title" className="font-serif text-2xl">Days</h2>
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
        <div className="flex flex-col gap-2">
          <h3 className="eyebrow text-muted-foreground">On no Day ({items[TRAY].length})</h3>
          <PhotoList id={TRAY} photoIds={items[TRAY]} photos={photos} label="Photos on no Day" />
        </div>
        {days.map((day) => (
          <article key={day.id} className="flex flex-col gap-4 border border-border p-6">
            <DayText day={day} cities={cities} onChange={(patch) => patchDay(day.id, patch)} onNotice={onNotice} onToggle={() => void toggle(day)} />
            <PhotoList id={dayKey(day.id)} photoIds={items[dayKey(day.id)]} photos={photos} label={`Photos of ${day.date}`} dim={!day.visible} onRemove={(photoId) => void takeOff(day, photoId)} />
          </article>
        ))}
        <DragOverlay>{active !== null && photos.get(active) ? <Thumb photo={photos.get(active)!} className={`h-24 ${SHAPE[photos.get(active)!.orientation]}`} /> : null}</DragOverlay>
      </DndContext>
    </section>
  );
}

export function AdminTripEditor({ trip, cities }: Props) {
  const [notice, setNotice] = useState('');
  return (
    <div className="flex flex-col gap-12">
      <Toast text={notice} onDone={() => setNotice('')} />
      <Cover trip={trip} onNotice={setNotice} />
      <Highlights trip={trip} onNotice={setNotice} />
      <Days trip={trip} cities={cities} onNotice={setNotice} />
    </div>
  );
}
