/**
 * Picture preparation in the browser: crop square, resize, JPEG. Small and isolated on purpose:
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

/** The side of the output: the crop side, never above `MAX_SIDE`, never upscaled. */
export function outputSide(side: number) {
	return Math.min(side, MAX_SIDE);
}

/** Crops the image to its centred square, resizes it to at most 1600 px and encodes a JPEG. Browser only. */
export async function prepareSquareJpeg(file: Blob): Promise<Blob> {
	const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
	try {
		const { sx, sy, side } = squareCrop(bitmap.width, bitmap.height);
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
