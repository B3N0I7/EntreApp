import { describe, expect, it } from 'vitest';
import { calculateReviewSchedule } from './spacedRepetition';

const now = new Date('2026-10-30T12:00:00.000Z');

describe('calculateReviewSchedule', () => {
	it('increases intervals after consecutive correct answers', () => {
		expect(calculateReviewSchedule(0, true, now)).toEqual({
			consecutiveCorrect: 1,
			nextReviewAt: '2026-10-31T12:00:00.000Z'
		});
		expect(calculateReviewSchedule(1, true, now).nextReviewAt).toBe('2026-11-02T12:00:00.000Z');
		expect(calculateReviewSchedule(2, true, now).nextReviewAt).toBe('2026-11-06T12:00:00.000Z');
		expect(calculateReviewSchedule(3, true, now).nextReviewAt).toBe('2026-11-13T12:00:00.000Z');
	});

	it('caps the interval at fourteen days', () => {
		expect(calculateReviewSchedule(20, true, now)).toEqual({
			consecutiveCorrect: 21,
			nextReviewAt: '2026-11-13T12:00:00.000Z'
		});
	});

	it('makes a missed item due immediately and resets its streak', () => {
		expect(calculateReviewSchedule(4, false, now)).toEqual({
			consecutiveCorrect: 0,
			nextReviewAt: now.toISOString()
		});
	});
});
