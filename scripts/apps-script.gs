const HISTORY_SHEET_NAME = 'Historique';
const HISTORY_HEADERS = ['date', 'userId', 'module', 'score', 'erreurs'];
const PIN_MIN_LENGTH = 6;
const PIN_MAX_LENGTH = 12;
const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_LOCK_MILLIS = 15 * 60 * 1000;
const REQUEST_MAX_AGE_MILLIS = 5 * 60 * 1000;

const ACCOUNTS = {
	abdulnaser: { name: 'Abdulnaser', role: 'student' },
	ali: { name: 'Ali', role: 'student' },
	fatima: { name: 'Fatima', role: 'student' },
	farzana: { name: 'Farzana', role: 'student' },
	gulnaz: { name: 'Gulnaz', role: 'student' },
	husna: { name: 'Husna', role: 'student' },
	manar: { name: 'Manar', role: 'student' },
	maoud: { name: 'Maoud', role: 'student' },
	olga: { name: 'Olga', role: 'student' },
	pema: { name: 'Pema', role: 'student' },
	sepideh: { name: 'Sepideh', role: 'student' },
	tsogyal: { name: 'Tsogyal', role: 'student' },
	vitalii: { name: 'Vitalii', role: 'student' },
	prof: { name: 'Prof', role: 'admin' }
};

function doPost(event) {
	try {
		const envelope = JSON.parse(event.postData.contents);
		const payload = verifyRequest(envelope);
		const data = dispatch(payload);
		return jsonOutput({ status: 'success', data: data });
	} catch (error) {
		return jsonOutput({
			status: 'error',
			code: error.code || 'INTERNAL_ERROR',
			message: error.message || 'Request failed.'
		});
	}
}

function doGet() {
	return jsonOutput({ status: 'error', code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' });
}

function initializeAccounts() {
	const properties = PropertiesService.getScriptProperties();
	const bootstrapPin = properties.getProperty('BOOTSTRAP_PROF_PIN');
	if (!properties.getProperty('APP_SHARED_SECRET') || !properties.getProperty('PIN_PEPPER')) {
		throw new Error('Set APP_SHARED_SECRET and PIN_PEPPER in Script Properties first.');
	}
	if (!isValidPin(bootstrapPin)) throw new Error('Set BOOTSTRAP_PROF_PIN to 6-12 digits first.');
	if (properties.getProperty('PIN_prof')) throw new Error('Prof is already initialized.');

	properties.setProperty('PIN_prof', JSON.stringify(createPinRecord(bootstrapPin)));
	properties.deleteProperty('BOOTSTRAP_PROF_PIN');
}

function verifyRequest(envelope) {
	const properties = PropertiesService.getScriptProperties();
	const secret = properties.getProperty('APP_SHARED_SECRET');
	const timestamp = Number(envelope && envelope.timestamp);
	const payloadJson = envelope && envelope.payloadJson;
	if (!secret || typeof payloadJson !== 'string' || !Number.isFinite(timestamp)) {
		throw apiError('INVALID_REQUEST', 'Invalid request.');
	}
	if (Math.abs(Date.now() - timestamp) > REQUEST_MAX_AGE_MILLIS) {
		throw apiError('INVALID_REQUEST', 'Request expired.');
	}

	// Explicit UTF-8 charset: payloads with accented characters (e.g. erreurs
	// de vocabulaire) must hash the same bytes as Node's createHmac() client-side.
	const expected = bytesToHex(
		Utilities.computeHmacSha256Signature(
			timestamp + '.' + payloadJson,
			secret,
			Utilities.Charset.UTF_8
		)
	);
	if (!constantTimeEqual(expected, String(envelope.signature || ''))) {
		throw apiError('INVALID_REQUEST', 'Invalid request.');
	}

	return JSON.parse(payloadJson);
}

function dispatch(payload) {
	if (!payload || typeof payload.action !== 'string') {
		throw apiError('INVALID_REQUEST', 'Invalid action.');
	}

	switch (payload.action) {
		case 'login':
			return login(payload.userId, payload.pin);
		case 'history':
			return readHistory(payload.actorUserId, payload.targetUserId);
		case 'savePartie':
			return savePartie(payload.actorUserId, payload.partie);
		case 'resetPin':
			return resetPin(payload.actorUserId, payload.targetUserId, payload.newPin);
		default:
			throw apiError('INVALID_REQUEST', 'Unknown action.');
	}
}

function login(userId, pin) {
	if (!ACCOUNTS[userId] || !isValidPin(pin)) {
		throw apiError('INVALID_CREDENTIALS', 'Invalid credentials.');
	}

	const lock = LockService.getScriptLock();
	lock.waitLock(5000);
	try {
		const properties = PropertiesService.getScriptProperties();
		const attemptsKey = 'LOGIN_' + userId;
		const attempt = JSON.parse(properties.getProperty(attemptsKey) || '{}');
		if (attempt.lockUntil && attempt.lockUntil > Date.now()) {
			throw apiError('ACCOUNT_LOCKED', 'Too many attempts.');
		}

		const record = JSON.parse(properties.getProperty('PIN_' + userId) || 'null');
		if (!record || !verifyPin(pin, record)) {
			const failures = (attempt.failures || 0) + 1;
			properties.setProperty(
				attemptsKey,
				JSON.stringify({
					failures: failures,
					lockUntil: failures >= LOGIN_ATTEMPT_LIMIT ? Date.now() + LOGIN_LOCK_MILLIS : 0
				})
			);
			if (failures >= LOGIN_ATTEMPT_LIMIT) {
				throw apiError('ACCOUNT_LOCKED', 'Too many attempts.');
			}
			throw apiError('INVALID_CREDENTIALS', 'Invalid credentials.');
		}

		properties.deleteProperty(attemptsKey);
		return { authenticated: true };
	} finally {
		lock.releaseLock();
	}
}

function readHistory(actorUserId, targetUserId) {
	const actor = requireAccount(actorUserId);
	const target = targetUserId || actorUserId;
	if (!ACCOUNTS[target]) throw apiError('INVALID_REQUEST', 'Unknown account.');
	if (actor.role !== 'admin' && target !== actorUserId) {
		throw apiError('FORBIDDEN', 'Access denied.');
	}

	const rows = getHistorySheet().getDataRange().getValues();
	const history = [];
	for (let index = 1; index < rows.length; index += 1) {
		const row = rows[index];
		const rowUserId = String(row[1] || '');
		if (targetUserId && rowUserId !== target) continue;
		if (!targetUserId && actor.role !== 'admin' && rowUserId !== actorUserId) continue;
		history.push({
			date: row[0] instanceof Date ? row[0].toISOString() : String(row[0] || ''),
			userId: rowUserId,
			module: String(row[2] || ''),
			score: String(row[3] || ''),
			erreurs: parseErrors(row[4])
		});
	}
	return history.reverse();
}

function savePartie(actorUserId, partie) {
	requireAccount(actorUserId);
	if (
		!partie ||
		!isValidModule(partie.module) ||
		!/^\d{1,4}\/\d{1,4}$/.test(String(partie.score || '')) ||
		!Array.isArray(partie.erreurs) ||
		partie.erreurs.length > 100
	) {
		throw apiError('INVALID_REQUEST', 'Invalid history record.');
	}

	const serializedErrors = JSON.stringify(partie.erreurs);
	if (serializedErrors.length > 40000) throw apiError('INVALID_REQUEST', 'Record is too large.');
	getHistorySheet().appendRow([
		new Date().toISOString(),
		actorUserId,
		partie.module,
		partie.score,
		serializedErrors
	]);
	return { saved: true };
}

function resetPin(actorUserId, targetUserId, newPin) {
	const actor = requireAccount(actorUserId);
	if (actor.role !== 'admin') throw apiError('FORBIDDEN', 'Access denied.');
	if (!ACCOUNTS[targetUserId] || !isValidPin(newPin)) {
		throw apiError('INVALID_REQUEST', 'Invalid account or PIN.');
	}

	const lock = LockService.getScriptLock();
	lock.waitLock(5000);
	try {
		const properties = PropertiesService.getScriptProperties();
		properties.setProperty('PIN_' + targetUserId, JSON.stringify(createPinRecord(newPin)));
		properties.deleteProperty('LOGIN_' + targetUserId);
	} finally {
		lock.releaseLock();
	}
	return { reset: true };
}

function requireAccount(userId) {
	const account = ACCOUNTS[userId];
	if (!account) throw apiError('FORBIDDEN', 'Access denied.');
	return account;
}

function getHistorySheet() {
	const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HISTORY_SHEET_NAME);
	if (!sheet) throw apiError('CONFIGURATION_ERROR', 'Historique sheet not found.');
	const headers = sheet.getRange(1, 1, 1, HISTORY_HEADERS.length).getValues()[0];
	if (
		HISTORY_HEADERS.some(function (header, index) {
			return headers[index] !== header;
		})
	) {
		throw apiError('CONFIGURATION_ERROR', 'Historique headers do not match.');
	}
	return sheet;
}

function parseErrors(value) {
	if (!value) return [];
	try {
		const errors = JSON.parse(String(value));
		return Array.isArray(errors) ? errors : [];
	} catch (error) {
		return [];
	}
}

function isValidModule(module) {
	return (
		[
			'vocabulaire-definition',
			'vocabulaire-mot',
			'expressions-word-to-definition',
			'expressions-definition-to-word',
			'conjugaison'
		].indexOf(module) !== -1
	);
}

function isValidPin(pin) {
	return (
		typeof pin === 'string' &&
		new RegExp('^\\d{' + PIN_MIN_LENGTH + ',' + PIN_MAX_LENGTH + '}$').test(pin)
	);
}

function createPinRecord(pin) {
	const salt = Utilities.getUuid().replace(/-/g, '');
	return { salt: salt, hash: hashPin(pin, salt) };
}

function verifyPin(pin, record) {
	return constantTimeEqual(hashPin(pin, record.salt), record.hash);
}

function hashPin(pin, salt) {
	const pepper = PropertiesService.getScriptProperties().getProperty('PIN_PEPPER');
	return bytesToHex(Utilities.computeHmacSha256Signature(salt + ':' + pin, pepper));
}

function bytesToHex(bytes) {
	return bytes
		.map(function (byte) {
			return ('0' + ((byte + 256) % 256).toString(16)).slice(-2);
		})
		.join('');
}

function constantTimeEqual(left, right) {
	if (left.length !== right.length) return false;
	let difference = 0;
	for (let index = 0; index < left.length; index += 1) {
		difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
	}
	return difference === 0;
}

function apiError(code, message) {
	const error = new Error(message);
	error.code = code;
	return error;
}

function jsonOutput(value) {
	return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(
		ContentService.MimeType.JSON
	);
}
