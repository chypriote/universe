import { describe, expect, it } from 'vitest';
import { checkFileSize, MAX_UPLOAD_BYTES, outputSide, squareCrop } from './image-prep';

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
