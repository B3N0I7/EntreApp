const INTERVAL_DAYS = [1, 3, 7, 14] as const;
const DAY_MILLIS = 24 * 60 * 60 * 1000;

export type ReviewSchedule = {
	consecutiveCorrect: number;
	nextReviewAt: string;
};

export function calculateReviewSchedule(
	previousCorrect: number,
	isCorrect: boolean,
	now = new Date()
): ReviewSchedule {
	if (!isCorrect) {
		return { consecutiveCorrect: 0, nextReviewAt: now.toISOString() };
	}

	const consecutiveCorrect = Math.max(0, Math.floor(previousCorrect)) + 1;
	const intervalDays = INTERVAL_DAYS[Math.min(consecutiveCorrect - 1, INTERVAL_DAYS.length - 1)];
	return {
		consecutiveCorrect,
		nextReviewAt: new Date(now.getTime() + intervalDays * DAY_MILLIS).toISOString()
	};
}
