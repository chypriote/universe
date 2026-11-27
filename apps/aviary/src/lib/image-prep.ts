/**
 * Picture preparation in the browser: square crop (chosen by the user), resize, JPEG. Small and isolated on purpose:
 * everything but `prepareSquareJpeg` is pure and tested; `prepareSquareJpeg` needs a browser
 * (canvas) and is checked by hand.
 */

/** A file over this size before resize is refused. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
/** Longest side of the uploaded Picture. A square, so both sides. */
export const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.85;

/** The label code name of the refusal, or null when the file may go on. */
export function checkFileSize(bytes: number): 'PictureTooLarge' | null {
	return bytes > MAX_UPLOAD_BYTES ? 'PictureTooLarge' : null;
}

/** The centred square of an image: its top-left corner and side, in whole pixels. */
export function squareCrop(width: number, height: number) {
	const side = Math.min(width, height);
	return { sx: Math.floor((width - side) / 2), sy: Math.floor((height - side) / 2), side };
}

/** A square cut of an image: top-left corner and side, in image pixels. */
export interface Crop {
	sx: number;
	sy: number;
	side: number;
}

/** Most the crop square can shrink to: a zoom of 4 shows a quarter of the shorter side. */
export const MAX_ZOOM = 4;

function fit(width: number, height: number, centreX: number, centreY: number, side: number): Crop {
	const whole = Math.min(width, height);
	const s = Math.round(Math.min(whole, Math.max(whole / MAX_ZOOM, side)));
	const sx = Math.round(Math.min(width - s, Math.max(0, centreX - s / 2)));
	const sy = Math.round(Math.min(height - s, Math.max(0, centreY - s / 2)));
	return { sx, sy, side: s };
}

/** How far the crop is zoomed in: 1 shows the whole shorter side. */
export function zoomOf(crop: Crop, width: number, height: number) {
	return Math.min(width, height) / crop.side;
}

/** The same crop centre at another zoom (1 to `MAX_ZOOM`). */
export function zoomCrop(crop: Crop, width: number, height: number, zoom: number): Crop {
	const side = Math.min(width, height) / zoom;
	return fit(width, height, crop.sx + crop.side / 2, crop.sy + crop.side / 2, side);
}

/** Moves the crop by image pixels, keeping it inside the image. */
export function panCrop(crop: Crop, width: number, height: number, dx: number, dy: number): Crop {
	return fit(width, height, crop.sx + crop.side / 2 + dx, crop.sy + crop.side / 2 + dy, crop.side);
}

/** The side of the output: the crop side, never above `MAX_SIDE`, never upscaled. */
export function outputSide(side: number) {
	return Math.min(side, MAX_SIDE);
}

/** Cuts the crop (default: the centred square), resizes it to at most 1600 px and encodes a JPEG. Browser only. */
export async function prepareSquareJpeg(file: Blob, crop?: Crop): Promise<Blob> {
	const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
	try {
		const { sx, sy, side } = crop ?? squareCrop(bitmap.width, bitmap.height);
		const size = outputSide(side);
		const canvas = document.createElement('canvas');
		canvas.width = size;
		canvas.height = size;
		const context = canvas.getContext('2d');
		if (!context) throw new Error('no canvas');
		context.imageSmoothingQuality = 'high';
		context.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
		const blob = await new Promise<Blob | null>((done) =>
			canvas.toBlob(done, 'image/jpeg', JPEG_QUALITY)
		);
		if (!blob) throw new Error('encode failed');
		return blob;
	} finally {
		bitmap.close();
	}
}
