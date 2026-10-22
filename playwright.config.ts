import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173,
		env: { SESSION_SECRET: 'playwright-session-secret-with-at-least-32-bytes' }
	},
	testMatch: '**/*.e2e.{ts,js}'
});
