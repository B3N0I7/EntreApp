import type { Erreur, ModuleType } from './sheetService';

const REPLAY_STORAGE_KEY = 'delf_replay';

export type ReplayRequest = {
	module: ModuleType;
	erreurs: Erreur[];
};

type ReplayStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getStorage(storage?: ReplayStorage): ReplayStorage | null {
	if (storage) return storage;
	return typeof window === 'undefined' ? null : window.sessionStorage;
}

export function storeReplay(replay: ReplayRequest, storage?: ReplayStorage): void {
	getStorage(storage)?.setItem(REPLAY_STORAGE_KEY, JSON.stringify(replay));
}

export function takeReplay(module: ModuleType, storage?: ReplayStorage): Erreur[] | null {
	const target = getStorage(storage);
	if (!target) return null;

	const raw = target.getItem(REPLAY_STORAGE_KEY);
	target.removeItem(REPLAY_STORAGE_KEY);
	if (!raw) return null;

	try {
		const replay = JSON.parse(raw) as ReplayRequest;
		return replay.module === module && Array.isArray(replay.erreurs) ? replay.erreurs : null;
	} catch {
		return null;
	}
}
