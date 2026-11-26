/** A row of tabs; the current one has a cinnabar underline. */
export function Tabs<T extends string>({ tabs, current, onChange }: { tabs: { id: T; label: string }[]; current: T; onChange: (tab: T) => void }) {
  return (
    <div role="tablist" className="flex flex-wrap gap-6 border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={current === tab.id}
          className="-mb-px cursor-pointer border-b-2 border-transparent py-2 text-muted-foreground aria-selected:border-primary aria-selected:text-foreground"
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
