import { ChinaMap } from './ChinaMap';

/** The Provinces that have Activities; a click opens the Activity pictures of one. */
export function GalleryProvinceMap({ provinces, current }: { provinces: string[]; current: string }) {
  return (
    <div className="border border-border">
      <p className="border-b border-border px-3 py-1.5 text-xs text-muted-foreground">Pick a Province</p>
      <ChinaMap
        regions={provinces.map((name) => ({ name, zh: '', visited: false }))}
        selectedRegion={current}
        onSelectRegion={(name) => {
          window.location.search = `?activities=${encodeURIComponent(name)}`;
        }}
        preview={false}
      />
    </div>
  );
}
