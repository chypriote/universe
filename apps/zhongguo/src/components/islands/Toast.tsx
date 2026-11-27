import { useEffect } from 'react';

/* Confirms a save or a failure for a few seconds, fixed to the corner so it shows wherever the page is scrolled. */
export function Toast({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => {
    if (!text) return;
    const timer = setTimeout(onDone, 4000);
    return () => clearTimeout(timer);
  }, [text, onDone]);

  if (!text) return null;
  return (
    <p
      role="status"
      className="fixed bottom-4 right-4 z-50 max-w-sm border border-foreground bg-foreground px-4 py-3 text-sm text-background"
    >
      {text}
    </p>
  );
}
