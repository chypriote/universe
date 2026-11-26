import { useState, type SyntheticEvent } from 'react';
import { button, field, message, save } from './admin-form';

/** A new plan from its title; it opens in the editor. */
export function NewPlanForm() {
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function create(event: SyntheticEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    const result = await save('POST', '/api/admin/plans', { title });
    if (result.ok) return window.location.assign(`/admin/plans/${encodeURIComponent(String(result.slug))}`);
    setNotice(message(result.error));
    setBusy(false);
  }

  return (
    <form onSubmit={(event) => void create(event)} className="flex flex-col gap-3 border border-border p-6">
      <label className="flex flex-col gap-1 text-sm">
        Title
        <input required className={field} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="For example Yunnan" />
      </label>
      {notice && (
        <p role="status" className="text-sm text-error">
          {notice}
        </p>
      )}
      <div>
        <button type="submit" className={button} disabled={busy}>
          Create plan
        </button>
      </div>
    </form>
  );
}
