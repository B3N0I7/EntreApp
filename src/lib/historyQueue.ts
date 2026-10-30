import type { PayloadPartie } from './sheetService';

export type PendingHistory = {
	ownerId: string;
	payload: PayloadPartie;
};

const DATABASE_NAME = 'entre-app-history';
const STORE_NAME = 'pending';
const FALLBACK_KEY = 'entre.pending-history';

function openDatabase(): Promise<IDBDatabase | null> {
	if (typeof indexedDB === 'undefined') return Promise.resolve(null);
	return new Promise((resolve) => {
		const request = indexedDB.open(DATABASE_NAME, 1);
		request.onupgradeneeded = () => {
			if (!request.result.objectStoreNames.contains(STORE_NAME)) {
				request.result.createObjectStore(STORE_NAME, { keyPath: 'payload.sessionId' });
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => resolve(null);
	});
}

function readFallback(): PendingHistory[] {
	if (typeof window === 'undefined') return [];
	try {
		const value = JSON.parse(window.localStorage.getItem(FALLBACK_KEY) ?? '[]') as unknown;
		return Array.isArray(value) ? (value as PendingHistory[]) : [];
	} catch {
		return [];
	}
}

function writeFallback(items: PendingHistory[]): void {
	if (typeof window !== 'undefined') {
		window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(items.slice(-50)));
	}
}

function enqueueFallback(item: PendingHistory): void {
	const items = readFallback().filter(
		(queued) => queued.payload.sessionId !== item.payload.sessionId
	);
	writeFallback([...items, item]);
}

function removeFallback(sessionId: string): void {
	writeFallback(readFallback().filter((item) => item.payload.sessionId !== sessionId));
}

export async function enqueueHistory(item: PendingHistory): Promise<void> {
	const database = await openDatabase();
	if (!database) {
		enqueueFallback(item);
		return;
	}

	try {
		await new Promise<void>((resolve, reject) => {
			const transaction = database.transaction(STORE_NAME, 'readwrite');
			transaction.objectStore(STORE_NAME).put(item);
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
			transaction.onabort = () => reject(transaction.error);
		});
	} catch {
		enqueueFallback(item);
	}
}

export async function listPendingHistory(ownerId: string): Promise<PendingHistory[]> {
	const database = await openDatabase();
	if (!database) return readFallback().filter((item) => item.ownerId === ownerId);

	try {
		const databaseItems = await new Promise<PendingHistory[]>((resolve, reject) => {
			const transaction = database.transaction(STORE_NAME, 'readonly');
			const request = transaction.objectStore(STORE_NAME).getAll();
			request.onsuccess = () => resolve(request.result as PendingHistory[]);
			request.onerror = () => reject(request.error);
		});
		const itemsById = new Map(
			[...databaseItems, ...readFallback()].map((item) => [item.payload.sessionId, item])
		);
		return [...itemsById.values()].filter((item) => item.ownerId === ownerId);
	} catch (error) {
		const fallback = readFallback().filter((item) => item.ownerId === ownerId);
		if (fallback.length > 0) return fallback;
		throw error;
	}
}

export async function removePendingHistory(sessionId: string): Promise<void> {
	const database = await openDatabase();
	if (!database) {
		removeFallback(sessionId);
		return;
	}

	await new Promise<void>((resolve, reject) => {
		const transaction = database.transaction(STORE_NAME, 'readwrite');
		transaction.objectStore(STORE_NAME).delete(sessionId);
		transaction.oncomplete = () => resolve();
		transaction.onerror = () => reject(transaction.error);
		transaction.onabort = () => reject(transaction.error);
	});
	removeFallback(sessionId);
}
