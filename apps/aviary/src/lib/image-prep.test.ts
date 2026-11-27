import { describe, expect, it } from 'vitest';
import {
	checkFileSize,
	MAX_UPLOAD_BYTES,
	outputSide,
	panCrop,
	squareCrop,
	zoomCrop,
	zoomOf
} from './image-prep';

describe('squareCrop', () => {
	it('crops the centre of a landscape image', () => {
		expect(squareCrop(400, 200)).toEqual({ sx: 100, sy: 0, side: 200 });
	});
	it('crops the centre of a portrait image', () => {
		expect(squareCrop(200, 500)).toEqual({ sx: 0, sy: 150, side: 200 });
	});
	it('keeps a square as it is', () => {
		expect(squareCrop(300, 300)).toEqual({ sx: 0, sy: 0, side: 300 });
	});
	it('rounds to whole pixels', () => {
		expect(squareCrop(201, 100)).toEqual({ sx: 50, sy: 0, side: 100 });
	});
});

describe('outputSide', () => {
	it('never exceeds 1600 px', () => {
		expect(outputSide(4000)).toBe(1600);
	});
	it('never upscales', () => {
		expect(outputSide(800)).toBe(800);
	});
});

describe('checkFileSize', () => {
	it('accepts up to 25 MB', () => {
		expect(MAX_UPLOAD_BYTES).toBe(25 * 1024 * 1024);
		expect(checkFileSize(MAX_UPLOAD_BYTES)).toBeNull();
	});
	it('names the error code for a bigger file', () => {
		expect(checkFileSize(MAX_UPLOAD_BYTES + 1)).toBe('PictureTooLarge');
	});
});

describe('zoomCrop', () => {
	it('keeps the centre and shrinks the side', () => {
		const crop = zoomCrop(squareCrop(400, 200), 400, 200, 2);
		expect(crop).toEqual({ sx: 150, sy: 50, side: 100 });
		expect(zoomOf(crop, 400, 200)).toBe(2);
	});
	it('never zooms past 4', () => {
		expect(zoomCrop(squareCrop(400, 200), 400, 200, 10).side).toBe(50);
	});
	it('never zooms out past the whole shorter side', () => {
		expect(zoomCrop(squareCrop(400, 200), 400, 200, 0.5).side).toBe(200);
	});
	it('stays inside the image near an edge', () => {
		const edge = { sx: 300, sy: 0, side: 100 };
		expect(zoomCrop(edge, 400, 200, 1)).toEqual({ sx: 200, sy: 0, side: 200 });
	});
});

describe('panCrop', () => {
	it('moves by image pixels', () => {
		expect(panCrop({ sx: 100, sy: 0, side: 200 }, 400, 200, 30, 0)).toEqual({
			sx: 130,
			sy: 0,
			side: 200
		});
	});
	it('stops at the image edges', () => {
		expect(panCrop({ sx: 100, sy: 50, side: 100 }, 400, 200, -999, 999)).toEqual({
			sx: 0,
			sy: 100,
			side: 100
		});
	});
});
