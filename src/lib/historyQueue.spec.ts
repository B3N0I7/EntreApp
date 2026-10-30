import { afterEach, describe, expect, it, vi } from 'vitest';
import { enqueueHistory, listPendingHistory, type PendingHistory } from './historyQueue';

const pendingItem: PendingHistory = {
	ownerId: 'student-id',
	payload: {
		sessionId: '00000000-0000-4000-8000-000000000001',
		module: 'vocabulaire-mot',
		score: '1/1',
		erreurs: [],
		tentatives: []
	}
};

afterEach(() => vi.unstubAllGlobals());

describe('history queue fallback', () => {
	it('keeps a run queued when IndexedDB transactions fail', async () => {
		const values = new Map<string, string>();
		vi.stubGlobal('window', {
			localStorage: {
				getItem: (key: string) => values.get(key) ?? null,
				setItem: (key: string, value: string) => values.set(key, value)
			}
		});

		const database = {
			objectStoreNames: { contains: () => true },
			transaction: () => {
				throw new Error('IndexedDB transaction failed.');
			}
		} as unknown as IDBDatabase;
		const request = {
			result: database,
			onupgradeneeded: null,
			onsucceed: null,
			onerror: null
		} as unknown as IDBOpenDBRequest;
		vi.stubGlobal('indexedDB', {
			open: () => {
				queueMicrotask(() => request.onsuccess?.call(request, new Event('success')));
				return request;
			}
		});

		await enqueueHistory(pendingItem);

		await expect(listPendingHistory(pendingItem.ownerId)).resolves.toEqual([pendingItem]);
	});
});
