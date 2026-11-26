import { useState } from 'react';
import { CircleX, Copy, Languages, Star } from 'lucide-react';
import type { Activity } from '@/lib/journal';
import { ACTIVITY_KINDS, ACTIVITY_RATINGS } from '@/lib/journal/activity-kinds';

const tip =
  'pointer-events-none absolute top-full left-0 z-10 mt-1.5 hidden whitespace-nowrap bg-foreground px-2 py-1 text-[11px] tracking-wide text-background group-hover:block group-focus:block';
const square =
  'grid size-6 cursor-pointer place-items-center border border-border text-muted-foreground hover:border-foreground hover:text-foreground';

/** One Activity of a Plan Day: its picture with the rating, name, description, price and the address to show a driver. */
export function ActivityRow({ activity }: { activity: Activity }) {
  const [chinese, setChinese] = useState(true);
  const rating = ACTIVITY_RATINGS.find((item) => item.value === activity.rating)?.label;
  const kind = ACTIVITY_KINDS.find((item) => item.value === activity.kind)?.label;
  const address = chinese ? activity.addressZh : activity.address;
  const price = activity.price === null ? null : activity.price === 0 ? 'Free' : `¥${activity.price} per person`;

  return (
    <article className="relative grid grid-cols-[88px_1fr] gap-3.5 py-4 sm:grid-cols-[132px_1fr] sm:gap-4.5">
      <div className="relative">
        {activity.picture ? (
          <img src={activity.picture} alt="" loading="lazy" className="aspect-square w-full object-cover" />
        ) : (
          <div className="aspect-square w-full bg-surface" aria-hidden="true"></div>
        )}
        {(activity.rating === 'do-not-miss' || activity.rating === 'recommended' || activity.rating === 'avoid') && (
          <span
            tabIndex={0}
            role="img"
            aria-label={rating}
            className="group absolute top-1.5 left-1.5 grid size-[30px] place-items-center rounded-full bg-background/95 shadow-sm sm:size-9"
          >
            {activity.rating === 'avoid' ? (
              <CircleX className="size-[21px] text-muted-foreground sm:size-[26px]" strokeWidth={1.8} />
            ) : (
              <Star
                className="size-[21px] text-primary sm:size-[26px]"
                strokeWidth={1.8}
                fill={activity.rating === 'do-not-miss' ? 'currentColor' : 'none'}
              />
            )}
            <span className={tip}>{rating}</span>
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="eyebrow mb-1.5 self-start border border-border px-2 py-0.5 !text-[10px] text-muted-foreground sm:absolute sm:top-4 sm:right-0 sm:mb-0">
          {kind}
        </span>
        <span className="font-serif text-lg leading-tight sm:pr-24">{activity.name}</span>
        <span
          tabIndex={0}
          className="group relative mt-0.5 cursor-help self-start border-b border-dotted border-muted-foreground text-xs text-muted-foreground"
          lang="zh"
        >
          {activity.nameZh}
          <span className={tip} lang="en">
            {activity.pinyin}
          </span>
        </span>
        {activity.description && <p className="mt-2 flex-1 text-sm leading-relaxed text-foreground/80">{activity.description}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11px] text-muted-foreground">
          {price && <span>{price}</span>}
          {(activity.address || activity.addressZh) && (
            <span className="ml-auto flex items-center gap-2 text-right">
              <span lang={chinese ? 'zh' : 'en'} className={chinese ? 'text-xs text-foreground' : 'text-foreground'}>
                {address}
              </span>
              <button type="button" className={square} title={chinese ? 'Show in English' : '显示中文'} onClick={() => setChinese(!chinese)}>
                <Languages className="size-3.5" aria-label="Switch language" />
              </button>
              <button
                type="button"
                className={square}
                title="Copy the address"
                onClick={() => void navigator.clipboard?.writeText(address)}
              >
                <Copy className="size-3.5" aria-label="Copy the address" />
              </button>
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
