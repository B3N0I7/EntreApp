import { createHmac, timingSafeEqual } from 'node:crypto';
import { getAccount, type AccountId, type AccountRole } from '../accounts';

export const SESSION_COOKIE = 'entre_session';
export const SESSION_DURATION_SECONDS = 60 * 60 * 8;

export type UserSession = {
	userId: AccountId | 'guest';
	name: string;
	role: AccountRole | 'guest';
	expiresAt: number;
};

type SessionClaims = UserSession;

function encode(value: string): string {
	return Buffer.from(value).toString('base64url');
}

function signature(payload: string, secret: string): Buffer {
	return createHmac('sha256', secret).update(payload).digest();
}

export function createSessionToken(session: UserSession, secret: string): string {
	if (Buffer.byteLength(secret) < 32) {
		throw new Error('SESSION_SECRET must contain at least 32 bytes.');
	}
	const payload = encode(JSON.stringify(session));
	return `${payload}.${signature(payload, secret).toString('base64url')}`;
}

export function verifySessionToken(
	token: string | undefined,
	secret: string,
	now = Date.now()
): UserSession | null {
	if (!token || Buffer.byteLength(secret) < 32) return null;
	const [payload, encodedSignature, ...extra] = token.split('.');
	if (!payload || !encodedSignature || extra.length > 0) return null;

	try {
		const received = Buffer.from(encodedSignature, 'base64url');
		const expected = signature(payload, secret);
		if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

		const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as SessionClaims;
		if (
			typeof claims.expiresAt !== 'number' ||
			!Number.isFinite(claims.expiresAt) ||
			claims.expiresAt <= now
		) {
			return null;
		}

		if (claims.userId === 'guest') {
			return claims.role === 'guest' && claims.name === 'Invité' ? claims : null;
		}

		const account = getAccount(claims.userId);
		if (!account || account.role !== claims.role || account.name !== claims.name) return null;
		return claims;
	} catch {
		return null;
	}
}
