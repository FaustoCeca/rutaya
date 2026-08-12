import { expect, type Page, test } from "@playwright/test";
import { PLACES } from "../helpers";
import { PlannerPage } from "./planner-page";

const ROSARIO = { latitude: -32.9442, longitude: -60.6505 };
const BUENOS_AIRES = { latitude: -34.6037, longitude: -58.3816 };

declare global {
	interface Window {
		__geoCalls?: number;
		__geoFixed?: boolean;
	}
}

// Cuenta cada pedido de posición en window.__geoCalls y marca window.__geoFixed
// cuando la app recibe el fix: permite sincronizar sin hooks de test en la app.
async function instrumentGeolocation(page: Page): Promise<void> {
	await page.addInitScript(() => {
		window.__geoCalls = 0;
		const original = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
		navigator.geolocation.getCurrentPosition = (onSuccess, onError, options) => {
			window.__geoCalls = (window.__geoCalls ?? 0) + 1;
			original(
				(pos) => {
					window.__geoFixed = true;
					onSuccess(pos);
				},
				onError,
				options,
			);
		};
	});
}

function photonRequest(page: Page) {
	return page.waitForRequest((req) => req.url().startsWith("https://photon.komoot.io"));
}

test.describe("Geolocalización", () => {
	test.use({ geolocation: ROSARIO, permissions: ["geolocation"] });

	test(
		"Search suggestions are biased to the user's GPS position",
		{ tag: ["@critical", "@e2e", "@planner", "@GEO-E2E-001"] },
		async ({ page }) => {
			const planner = new PlannerPage(page);
			await planner.setup();
			await instrumentGeolocation(page);
			await planner.goto();
			await page.waitForFunction(() => window.__geoFixed === true);

			const request = photonRequest(page);
			await planner.searchInput.click();
			await planner.searchInput.fill(PLACES.obelisco.query);

			const url = new URL((await request).url());
			expect(Number(url.searchParams.get("lat"))).toBeCloseTo(ROSARIO.latitude, 2);
			expect(Number(url.searchParams.get("lon"))).toBeCloseTo(ROSARIO.longitude, 2);
		},
	);

	test(
		"The location request waits until the welcome tour is dismissed",
		{ tag: ["@medium", "@e2e", "@planner", "@GEO-E2E-003"] },
		async ({ page }) => {
			const planner = new PlannerPage(page);
			await planner.setup({ firstVisit: true });
			await instrumentGeolocation(page);
			await planner.goto();

			await expect(page.getByText("Bienvenido a RutaYa")).toBeVisible();
			expect(await page.evaluate(() => window.__geoCalls)).toBe(0);

			await page.getByRole("button", { name: "¡Empezar!" }).click();

			await expect.poll(() => page.evaluate(() => window.__geoCalls)).toBeGreaterThan(0);
		},
	);

	test.describe("permiso denegado", () => {
		test.use({ permissions: [] });

		test(
			"Falls back silently to the map center without the permission",
			{ tag: ["@high", "@e2e", "@planner", "@GEO-E2E-002"] },
			async ({ page }) => {
				const planner = new PlannerPage(page);
				await planner.setup();
				await planner.goto();

				const request = photonRequest(page);
				await planner.searchInput.click();
				await planner.searchInput.fill(PLACES.obelisco.query);

				// sin GPS el sesgo cae al centro del mapa (default Buenos Aires)
				const url = new URL((await request).url());
				expect(Number(url.searchParams.get("lat"))).toBeCloseTo(BUENOS_AIRES.latitude, 2);
				expect(Number(url.searchParams.get("lon"))).toBeCloseTo(BUENOS_AIRES.longitude, 2);
				await expect(page.getByRole("status")).toBeHidden();
			},
		);
	});
});
