import { defineConfig } from '@playwright/test';

const sessionSecret = 'playwright-session-secret-with-at-least-32-bytes';
process.env.SESSION_SECRET = sessionSecret;

export default defineConfig({
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173,
		env: { SESSION_SECRET: sessionSecret }
	},
	testMatch: '**/*.e2e.{ts,js}'
});
