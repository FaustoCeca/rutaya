import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./tests",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: "list",
	use: {
		// puerto propio de los e2e para no chocar con (ni reusar) otros dev servers
		baseURL: "http://localhost:5199",
		trace: "on-first-retry",
	},
	// la app es mobile-first: emulamos el dispositivo real de un repartidor
	projects: [{ name: "mobile-chromium", use: { ...devices["Pixel 7"] } }],
	webServer: {
		command: "bunx vite --port 5199 --strictPort",
		url: "http://localhost:5199",
		reuseExistingServer: !process.env.CI,
	},
});
