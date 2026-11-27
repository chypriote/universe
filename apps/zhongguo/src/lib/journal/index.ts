import { env } from 'cloudflare:workers';
import { buildJournal, type JournalEnv } from './journal';
import { invalidating, snapshotInvalidation } from './invalidation';
import { withSnapshots } from './snapshots';
import type {
	AtlasWorkspace,
	GalleryWorkspace,
	Journal,
	JournalWorkspace,
	OwnerLogin,
	ProvinceCovers,
	PublicReads
} from './types';

export type { JournalEnv } from './journal';
export type * from './types';

export function createJournal(env: JournalEnv): Journal {
	return buildJournal(env);
}

const bindings = () => env as unknown as JournalEnv;

/** The reads of the public pages. Trip and plan pages come from snapshots. */
export function publicReads(): PublicReads {
	return withSnapshots(createJournal(bindings()), bindings().PHOTOS);
}

const invalidation = () => snapshotInvalidation(bindings().PHOTOS);

export const ownerLogin = (): OwnerLogin => createJournal(bindings());

// Each write part tells the invalidation what a successful write changed (docs/adr/0004).

export const provinceCovers = (): ProvinceCovers =>
	invalidating(
		createJournal(bindings()),
		{
			setProvinceCover: 'province-cover',
			setProvinceCoverFocus: 'province-cover',
			clearProvinceCover: 'province-cover'
		},
		invalidation()
	);

export const journalWorkspace = (): JournalWorkspace =>
	invalidating(
		createJournal(bindings()),
		{
			createTrip: 'trip',
			setTripVisible: 'trip',
			setTripCover: 'trip',
			setTripCoverFocus: 'trip',
			setHighlightPhotos: 'trip',
			addDay: 'trip',
			editDay: 'trip',
			setDayVisible: 'trip',
			setDayPhotos: 'trip',
			setDayActivities: 'trip',
			createPlan: 'plan',
			setPlanVisible: 'plan',
			setPlanSearchFlights: 'plan',
			setPlanCover: 'plan',
			setPlanCoverFocus: 'plan',
			setPlanHighlightPhotos: 'plan',
			addPlanDay: 'plan',
			editPlanDay: 'plan',
			deletePlanDay: 'plan',
			movePlanDay: 'plan',
			setPlanDayPhotos: 'plan',
			setPlanDayActivities: 'plan'
		},
		invalidation()
	);

export const atlas = (): AtlasWorkspace =>
	invalidating(
		createJournal(bindings()),
		{
			addCity: 'city',
			editCity: 'city',
			deleteCity: 'city',
			addActivity: 'activity',
			editActivity: 'activity',
			editActivities: 'activity',
			deleteActivity: 'activity',
			setProvinceSeason: 'season',
			setAirport: 'airport',
			deleteAirport: 'airport'
		},
		invalidation()
	);

export const galleryWorkspace = (): GalleryWorkspace =>
	invalidating(
		createJournal(bindings()),
		{
			uploadPhoto: 'trip',
			editPhotos: 'trip',
			deletePhotos: 'trip',
			uploadPlanPhoto: 'plan',
			setPlanPhotoCity: 'plan',
			setPlanPhotoTitle: 'plan',
			deletePlanPhoto: 'plan',
			uploadActivityPicture: 'activity',
			setActivityPictures: 'activity',
			deleteActivityPicture: 'activity',
			moveActivityPicture: 'activity'
		},
		invalidation()
	);
