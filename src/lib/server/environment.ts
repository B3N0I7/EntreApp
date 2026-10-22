export function getPrivateEnv(name: string): string | undefined {
	return process.env[name] || undefined;
}
