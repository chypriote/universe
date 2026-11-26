import { useState } from 'react';
import type { AdminActivity, AdminCityDetail, AdminProvinceDetail, CityPhoto, VisitedProvince } from '@/lib/journal';
import { projectLngLat } from '@/lib/china-map';
import { ActivitiesPanel } from './ActivitiesPanel';
import { AddCityForm, fieldClass as field } from './AddCityForm';
import { CityDetails, CityPhotos } from './AtlasCity';
import { ProvinceOverview } from './AtlasProvince';
import { ChinaMap, type ChinaMapCity } from './ChinaMap';
import { Toast } from './Toast';

export type AtlasTab = 'overview' | 'photos' | 'activities' | 'details';

type Props = {
  provinces: AdminProvinceDetail[];
  cities: AdminCityDetail[];
  activities: AdminActivity[];
  visited: VisitedProvince[];
  /** The Province shown, or the Province of the City shown. */
  provinceName: string;
  cityId: number | null;
  /** The Photos of the City shown. */
  photos: CityPhoto[];
  tab: AtlasTab | null;
};

const provinceHref = (name: string) => `/admin/atlas?province=${encodeURIComponent(name)}`;
const cityHref = (id: number, tab?: AtlasTab) => `/admin/atlas?city=${id}${tab ? `&tab=${tab}` : ''}`;
const cityCount = (count: number) => `${count} ${count === 1 ? 'City' : 'Cities'}`;
const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Provinces, Cities and Activities whose names hold the query, as links. */
function Results({ query, provinces, cities, activities }: { query: string; provinces: AdminProvinceDetail[]; cities: AdminCityDetail[]; activities: AdminActivity[] }) {
  const q = fold(query.trim());
  const hit = (...names: string[]) => names.some((name) => fold(name).includes(q));
  const links = [
    ...provinces.filter((item) => hit(item.name, item.nameZh)).map((item) => ({ key: `p${item.id}`, href: provinceHref(item.name), label: item.name, zh: item.nameZh, kind: 'Province' })),
    ...cities.filter((item) => hit(item.name, item.nameZh)).map((item) => ({ key: `c${item.id}`, href: cityHref(item.id), label: item.name, zh: item.nameZh, kind: item.province })),
    ...activities
      .filter((item) => hit(item.name, item.nameZh, item.pinyin))
      .map((item) => ({ key: `a${item.id}`, href: cityHref(item.cityId, 'activities'), label: item.name, zh: item.nameZh, kind: `Activity · ${item.city}` })),
  ].slice(0, 30);
  if (links.length === 0) return <p className="p-3 text-sm text-muted-foreground">Nothing found.</p>;
  return (
    <ul className="divide-y divide-border border border-border">
      {links.map((link) => (
        <li key={link.key}>
          <a href={link.href} className="flex items-baseline justify-between gap-3 px-3 py-2 no-underline text-foreground hover:text-primary">
            <span>
              {link.label} <span lang="zh" className="text-muted-foreground">{link.zh}</span>
            </span>
            <span className="truncate text-xs text-muted-foreground">{link.kind}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function Tabs({ tabs, current, onChange }: { tabs: { id: AtlasTab; label: string }[]; current: AtlasTab; onChange: (tab: AtlasTab) => void }) {
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

/** The Atlas: a map and a tree to find a Province or a City, and everything about the one picked. */
export function AdminAtlas(props: Props) {
  const { provinces, cities, activities, visited, cityId } = props;
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const province = provinces.find((item) => item.name === props.provinceName)!;
  const city = cities.find((item) => item.id === cityId);
  const allowed: AtlasTab[] = city ? ['photos', 'activities', 'details'] : ['overview', 'activities'];
  const [tab, setTab] = useState<AtlasTab>(props.tab && allowed.includes(props.tab) ? props.tab : allowed[0]);

  const provinceCities = cities.filter((item) => item.provinceId === province.id);
  const provinceActivities = activities.filter((item) => item.province === province.name);
  const cityActivities = city ? activities.filter((item) => item.cityId === city.id) : [];
  const describe = (months: number[]) => (months.length === 0 ? 'no Season' : `${months.length} months of Season`);

  const regions = provinces.map((item) => ({
    name: item.name,
    zh: item.nameZh,
    detail: describe(item.season),
    visited: visited.some((province) => province.name === item.name),
  }));
  const mapCities: ChinaMapCity[] = cities.map((item) => {
    const [x, y] = projectLngLat(item.lng, item.lat);
    return { key: String(item.id), name: item.name, zh: item.nameZh, x, y, major: item.major, province: item.province };
  });
  const go = (href: string) => (window.location.href = href);

  return (
    <div className="grid gap-10 lg:grid-cols-[24rem_minmax(0,1fr)] lg:gap-12">
      <Toast text={notice} onDone={() => setNotice('')} />
      <aside className="flex flex-col gap-4">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search a Province, City or Activity"
          aria-label="Search the Atlas"
          className={field}
        />
        {query.trim() ? (
          <Results query={query} provinces={provinces} cities={cities} activities={activities} />
        ) : (
          <>
            <div className="border border-border">
              <div className="flex items-center justify-between border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
                <span>{city ? `${province.name}, zoomed` : 'Click a Province or a City'}</span>
                {city && (
                  <a href={provinceHref(province.name)} className="hover:text-primary">
                    All China
                  </a>
                )}
              </div>
              <ChinaMap
                regions={regions}
                cities={mapCities}
                selectedRegion={province.name}
                selectedCity={city ? String(city.id) : null}
                onSelectRegion={(name) => go(provinceHref(name))}
                onSelectCity={(key) => go(cityHref(Number(key)))}
                zoomTo={city ? province.name : null}
                cityLabels={Boolean(city)}
                preview={false}
                regionTooltip
              />
            </div>
            <nav aria-label={`Cities of ${province.name}`}>
              <ul className="divide-y divide-border border border-border text-sm">
                <li>
                  <a
                    href={provinceHref(province.name)}
                    aria-current={city ? undefined : 'page'}
                    className="flex justify-between border-l-2 border-transparent px-3 py-2 no-underline text-foreground hover:text-primary aria-[current=page]:border-primary aria-[current=page]:bg-muted/40"
                  >
                    <span className="eyebrow">
                      {province.name} <span lang="zh">{province.nameZh}</span>
                    </span>
                    <span className="text-muted-foreground">{cityCount(provinceCities.length)}</span>
                  </a>
                </li>
                {provinceCities.map((item) => (
                  <li key={item.id}>
                    <a
                      href={cityHref(item.id)}
                      aria-current={item.id === city?.id ? 'page' : undefined}
                      className="flex justify-between border-l-2 border-transparent py-2 pl-6 pr-3 no-underline text-foreground hover:text-primary aria-[current=page]:border-primary aria-[current=page]:bg-muted/40"
                    >
                      <span>
                        {item.name} <span lang="zh">{item.nameZh}</span>
                      </span>
                      <span className="text-muted-foreground" title="Photos · Activities">
                        {item.photos} · {item.activities}
                      </span>
                    </a>
                    {item.id === city?.id && cityActivities.length > 0 && (
                      <ul className="border-t border-border">
                        {cityActivities.map((activity) => (
                          <li key={activity.id} className="py-1.5 pl-10 pr-3 text-muted-foreground">
                            {activity.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
            <details className="border border-border p-4">
              <summary className="cursor-pointer text-sm">Add a City to {province.name}</summary>
              <div className="mt-4">
                <AddCityForm provinces={provinces} provinceId={province.id} onAdded={(added) => go(cityHref(added.id))} onError={setNotice} />
              </div>
            </details>
          </>
        )}
      </aside>

      <section className="flex min-w-0 flex-col gap-6" aria-labelledby="atlas-title">
        <div>
          <p className="text-sm text-muted-foreground">
            <a href={provinceHref(province.name)} className="hover:text-primary">
              {province.name}
            </a>
            {city && ` / ${city.name}`}
          </p>
          <h2 id="atlas-title" className="mt-1 font-serif text-4xl">
            {city ? city.name : province.name} <span lang="zh">{city ? city.nameZh : province.nameZh}</span>
          </h2>
          <p className="mt-2 flex flex-wrap gap-2 text-xs">
            {city ? (
              <span className="border border-border px-2 py-0.5">{city.major ? 'Major City' : 'Minor City'}</span>
            ) : (
              <>
                {visited.some((item) => item.name === province.name) && <span className="border border-border px-2 py-0.5">Visited</span>}
                <span className="border border-border px-2 py-0.5">
                  {cityCount(provinceCities.length)} · {provinceActivities.length} Activities
                </span>
              </>
            )}
          </p>
        </div>

        {city ? (
          <>
            <Tabs
              tabs={[
                { id: 'photos', label: `Photos ${city.photos}` },
                { id: 'activities', label: `Activities ${cityActivities.length}` },
                { id: 'details', label: 'Details' },
              ]}
              current={tab}
              onChange={setTab}
            />
            {tab === 'photos' && <CityPhotos city={city} cities={cities} provinces={provinces} photos={props.photos} onNotice={setNotice} />}
            {tab === 'activities' && (
              <ActivitiesPanel activities={activities} cities={cities} inScope={(activity) => activity.cityId === city.id} cityId={city.id} onNotice={setNotice} />
            )}
            {tab === 'details' && <CityDetails city={city} provinces={provinces} onNotice={setNotice} />}
          </>
        ) : (
          <>
            <Tabs
              tabs={[
                { id: 'overview', label: 'Overview' },
                { id: 'activities', label: `Activities ${provinceActivities.length}` },
              ]}
              current={tab}
              onChange={setTab}
            />
            {tab === 'activities' ? (
              <ActivitiesPanel
                activities={activities}
                cities={cities}
                inScope={(activity) => activity.province === province.name}
                cityId={provinceCities[0]?.id}
                groupByCity
                onNotice={setNotice}
              />
            ) : (
              <ProvinceOverview province={province} visited={visited.find((item) => item.name === province.name)} onNotice={setNotice} />
            )}
          </>
        )}
      </section>
    </div>
  );
}
