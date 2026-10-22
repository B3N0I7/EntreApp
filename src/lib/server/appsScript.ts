import { createHmac } from 'node:crypto';
import { getPrivateEnv } from './environment';

export type AppsScriptAction = Record<string, unknown> & { action: string };

type AppsScriptSuccess<T> = { status: 'success'; data: T };
type AppsScriptFailure = { status: 'error'; code: string; message: string };

export class AppsScriptError extends Error {
	constructor(
		readonly code: string,
		message: string
	) {
		super(message);
		this.name = 'AppsScriptError';
	}
}

export async function callAppsScript<T>(payload: AppsScriptAction): Promise<T> {
	const url = getPrivateEnv('APPS_SCRIPT_URL');
	const secret = getPrivateEnv('APPS_SCRIPT_SHARED_SECRET');
	if (!url || !secret || Buffer.byteLength(secret) < 32) {
		throw new Error('Apps Script environment is not configured.');
	}

	const payloadJson = JSON.stringify(payload);
	const timestamp = Date.now().toString();
	const signature = createHmac('sha256', secret)
		.update(`${timestamp}.${payloadJson}`)
		.digest('hex');

	const response = await fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ timestamp, payloadJson, signature }),
		signal: AbortSignal.timeout(10_000)
	});
	if (!response.ok) throw new Error(`Apps Script returned HTTP ${response.status}.`);

	const result = (await response.json()) as AppsScriptSuccess<T> | AppsScriptFailure;
	if (result.status === 'error') throw new AppsScriptError(result.code, result.message);
	if (result.status !== 'success' || !('data' in result)) {
		throw new Error('Apps Script returned an invalid response.');
	}
	return result.data;
}
