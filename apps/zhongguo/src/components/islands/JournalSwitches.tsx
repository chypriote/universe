import { useState } from 'react';
import { button, message, save } from './admin-form';

type Switch = { key: string; label: string; on: boolean };

/** The on/off switches of a Trip or plan, saved one at a time to its API path. */
export function JournalSwitches({ url, switches }: { url: string; switches: Switch[] }) {
  const [values, setValues] = useState(
    Object.fromEntries(switches.map((item) => [item.key, item.on])),
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function flip(key: string) {
    setBusy(true);
    setNotice('');
    const result = await save('PATCH', url, { [key]: !values[key] });
    if (result.ok) setValues((current) => ({ ...current, [key]: !current[key] }));
    else setNotice(message(result.error));
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {switches.map((item) => (
        <button
          key={item.key}
          type="button"
          role="switch"
          aria-checked={values[item.key]}
          className={`${button} aria-checked:!border-foreground aria-checked:!bg-foreground aria-checked:!text-background`}
          disabled={busy}
          onClick={() => void flip(item.key)}
        >
          {item.label}: {values[item.key] ? 'on' : 'off'}
        </button>
      ))}
      {notice && (
        <p role="status" className="text-sm text-error">
          {notice}
        </p>
      )}
    </div>
  );
}
