import { useState } from 'react';
import type { CoverCandidate, VisitedProvince } from '@/lib/journal';

const button = 'btn btn-outline cursor-pointer !px-4 !py-2 disabled:cursor-not-allowed disabled:opacity-40';

const MESSAGES: Record<string, string> = {
  'unknown-province': 'The Province is no longer visited: reload the page',
  'unknown-photo': 'That Photo cannot be the cover: reload the page',
};

type Result = { ok: boolean; error?: string };

async function call(method: string, url: string, body?: unknown): Promise<Result> {
  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return await response.json();
  } catch {
    return { ok: false, error: 'The request failed' };
  }
}

/** Each Visited Province with its Province Cover; pick a new one from its Photos or clear it. */
export function AdminHome(props: { provinces: VisitedProvince[] }) {
  const [provinces, setProvinces] = useState(props.provinces);
  const [open, setOpen] = useState('');
  const [candidates, setCandidates] = useState<CoverCandidate[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const url = (name: string, path: string) => `/api/admin/provinces/${encodeURIComponent(name)}/${path}`;

  async function refresh() {
    try {
      setProvinces(await (await fetch('/api/admin/provinces')).json());
    } catch {
      setNotice('Saved, but the list did not reload');
    }
  }

  async function choose(name: string) {
    if (open === name) {
      setOpen('');
      return;
    }
    setNotice('');
    setBusy(true);
    try {
      const response = await fetch(url(name, 'candidates'));
      if (!response.ok) throw new Error();
      setCandidates(await response.json());
      setOpen(name);
    } catch {
      setNotice('The Photos did not load');
    }
    setBusy(false);
  }

  async function change(request: () => Promise<Result>) {
    setBusy(true);
    setNotice('');
    const result = await request();
    if (result.ok) {
      setOpen('');
      await refresh();
    } else {
      setNotice(MESSAGES[result.error ?? ''] ?? result.error ?? 'Not saved');
    }
    setBusy(false);
  }

  if (provinces.length === 0) return <p className="text-muted-foreground">No Visited Province yet.</p>;

  return (
    <div>
      {notice && (
        <p role="status" className="mb-4 text-sm text-error">
          {notice}
        </p>
      )}
      <ul className="divide-y divide-border border border-border">
        {provinces.map((province) => (
          <li key={province.name} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {province.photo ? (
                  <img src={province.photo} alt="" className="h-20 w-28 bg-surface object-cover" />
                ) : (
                  <div className="h-20 w-28 bg-surface" aria-hidden="true" />
                )}
                <div>
                  <p className="font-serif text-xl">
                    {province.name} <span lang="zh" className="font-cjk text-base text-muted-foreground">{province.nameZh}</span>
                  </p>
                  <p className={`eyebrow ${province.fallback ? 'text-muted-foreground' : 'text-gold-ink'}`}>
                    {province.fallback ? 'Fallback: first Photo' : 'Chosen cover'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className={button} disabled={busy} aria-expanded={open === province.name} onClick={() => void choose(province.name)}>
                  {open === province.name ? 'Close' : 'Pick a cover'}
                </button>
                {!province.fallback && (
                  <button
                    type="button"
                    className={button}
                    disabled={busy}
                    onClick={() => void change(() => call('DELETE', url(province.name, 'cover')))}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            {open === province.name && (
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {candidates.length === 0 && <li className="col-span-full text-sm text-muted-foreground">No Photo with a City in this Province.</li>}
                {candidates.map((photo) => (
                  <li key={photo.id}>
                    <button
                      type="button"
                      disabled={busy}
                      aria-pressed={photo.id === province.coverId}
                      aria-label={`${photo.name}, ${photo.tripTitle}`}
                      className="block w-full cursor-pointer border-2 border-transparent text-left aria-pressed:border-primary disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => void change(() => call('PUT', url(province.name, 'cover'), { photoId: photo.id }))}
                    >
                      <img src={photo.thumb} alt="" loading="lazy" className="aspect-[4/3] w-full bg-surface object-cover" />
                      <span className="mt-1 block truncate text-xs text-muted-foreground">{photo.tripTitle}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
