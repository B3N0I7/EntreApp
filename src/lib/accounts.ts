export const ACCOUNTS = [
	{ id: 'abdulnaser', name: 'Abdulnaser', role: 'student' },
	{ id: 'ali', name: 'Ali', role: 'student' },
	{ id: 'fatima', name: 'Fatima', role: 'student' },
	{ id: 'farzana', name: 'Farzana', role: 'student' },
	{ id: 'gulnaz', name: 'Gulnaz', role: 'student' },
	{ id: 'husna', name: 'Husna', role: 'student' },
	{ id: 'manar', name: 'Manar', role: 'student' },
	{ id: 'maoud', name: 'Maoud', role: 'student' },
	{ id: 'olga', name: 'Olga', role: 'student' },
	{ id: 'pema', name: 'Pema', role: 'student' },
	{ id: 'sepideh', name: 'Sepideh', role: 'student' },
	{ id: 'tsogyal', name: 'Tsogyal', role: 'student' },
	{ id: 'vitalii', name: 'Vitalii', role: 'student' },
	{ id: 'prof', name: 'Prof', role: 'admin' }
] as const;

export type Account = (typeof ACCOUNTS)[number];
export type AccountId = Account['id'];
export type AccountRole = Account['role'];

export function getAccount(id: string): Account | undefined {
	return ACCOUNTS.find((account) => account.id === id);
}
