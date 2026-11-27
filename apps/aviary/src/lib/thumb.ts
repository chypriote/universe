import { squareCrop } from './image-prep';

/** Side of a stored thumbnail: a tile is about 220 px wide at most, so this is sharp on a 2x screen. */
export const THUMB_SIDE = 400;

/** The URL a picture element asks for first. */
export const thumbUrl = (id: number) => `/pictures/${id}?size=thumb`;

/**
 * Cuts the centred square of a loaded picture, resizes it to `THUMB_SIDE` and stores it as the
 * thumbnail of Picture `id`. Browser only. Fire and forget: a failure just means the next view asks again.
 */
export async function storeThumb(id: number, img: HTMLImageElement): Promise<void> {
	try {
		const { sx, sy, side } = squareCrop(img.naturalWidth, img.naturalHeight);
		const size = Math.min(side, THUMB_SIDE);
		const canvas = document.createElement('canvas');
		canvas.width = size;
		canvas.height = size;
		const context = canvas.getContext('2d');
		if (!context) return;
		context.imageSmoothingQuality = 'high';
		context.drawImage(img, sx, sy, side, side, 0, 0, size, size);
		const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, 'image/jpeg', 0.8));
		if (!blob) return;
		await fetch(`/pictures/${id}`, {
			method: 'PUT',
			headers: { 'content-type': 'image/jpeg' },
			body: blob
		});
	} catch {
		// Not stored: the next view tries again.
	}
}
