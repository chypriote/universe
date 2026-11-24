import type { AdminCity, AdminProvince } from '@/lib/journal';

const ERRORS: Record<string, string> = {
  'invalid-name': 'Invalid name',
  'unknown-province': 'Unknown Province',
  'invalid-position': 'Longitude or latitude out of range',
  'name-taken': 'A City with this name exists',
  'unknown-city': 'Unknown City: reload the page',
  'in-use': 'A Photo, Day, hotel or restaurant still uses this City',
};

export const cityError = (error: string) => ERRORS[error] ?? error;

export const fieldClass = 'border border-border bg-surface px-3 py-2 text-sm text-foreground';
const button = 'btn btn-outline cursor-pointer !px-4 !py-2 disabled:cursor-not-allowed disabled:opacity-40';

type Props = {
  provinces: AdminProvince[];
  onAdded: (city: AdminCity) => void;
  onError: (message: string) => void;
};

/** The "Add a City" form, on the Photos and Cities pages. */
export function AddCityForm({ provinces, onAdded, onError }: Props) {
  async function add(form: HTMLFormElement) {
    const data = new FormData(form);
    const response = await fetch('/api/admin/cities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.get('name'),
        nameZh: data.get('nameZh'),
        provinceId: Number(data.get('provinceId')),
        lng: Number(data.get('lng')),
        lat: Number(data.get('lat')),
        major: data.get('major') === 'on',
      }),
    });
    const result = (await response.json()) as { ok: boolean; error?: string; city?: AdminCity };
    if (result.ok && result.city) {
      onAdded(result.city);
      form.reset();
    } else {
      onError(cityError(result.error ?? ''));
    }
  }

  return (
    <details className="border border-border p-6">
      <summary className="cursor-pointer font-serif text-2xl">Add a City</summary>
      <form
        className="mt-4 flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void add(event.currentTarget);
        }}
      >
        <input name="name" required placeholder="Name" aria-label="Name" className={fieldClass} />
        <input name="nameZh" required placeholder="中文名" aria-label="Chinese name" className={fieldClass} />
        <select name="provinceId" required aria-label="Province" className={fieldClass} defaultValue="">
          <option value="" disabled>
            Province
          </option>
          {provinces.map((province) => (
            <option key={province.id} value={province.id}>
              {province.name}
            </option>
          ))}
        </select>
        <input name="lng" required type="number" step="any" placeholder="Longitude" aria-label="Longitude" className={fieldClass} />
        <input name="lat" required type="number" step="any" placeholder="Latitude" aria-label="Latitude" className={fieldClass} />
        <label className="flex items-center gap-2 text-sm">
          <input name="major" type="checkbox" /> Major City
        </label>
        <button type="submit" className={button}>
          Add City
        </button>
      </form>
    </details>
  );
}
