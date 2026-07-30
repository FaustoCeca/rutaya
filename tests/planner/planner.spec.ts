import { expect, test } from "@playwright/test";
import { buildShareParam, PLACES } from "../helpers";
import { PlannerPage } from "./planner-page";

test.describe("Planner", () => {
	test(
		"User can plan a route and see the optimized summary",
		{ tag: ["@critical", "@e2e", "@planner", "@PLANNER-E2E-001"] },
		async ({ page }) => {
			const planner = new PlannerPage(page);
			await planner.setup();
			await planner.goto();

			await planner.addStop(PLACES.obelisco);
			await planner.addStop(PLACES.caminito);

			await planner.verifySummary("2 paradas · 10 min · 3 km");
			await planner.expandSheet();
			await expect(planner.stopItem(PLACES.obelisco.label)).toContainText("Origen");
			await expect(planner.stopItem(PLACES.caminito.label)).toBeVisible();
		},
	);

	test(
		"Roundtrip toggle recalculates the route with the return leg",
		{ tag: ["@high", "@e2e", "@planner", "@PLANNER-E2E-002"] },
		async ({ page }) => {
			const planner = new PlannerPage(page);
			await planner.setup();
			await planner.goto();
			await planner.addStop(PLACES.obelisco);
			await planner.addStop(PLACES.caminito);
			await planner.verifySummary("2 paradas · 10 min · 3 km");

			await planner.expandSheet();
			await planner.roundtripToggle.check();

			await planner.verifySummary("2 paradas · 20 min · 6 km");
			await expect(page.getByText("Vuelta al origen")).toBeVisible();
		},
	);

	test(
		"Creating a trip locks editing and survives a reload",
		{ tag: ["@critical", "@e2e", "@planner", "@PLANNER-E2E-003"] },
		async ({ page }) => {
			const planner = new PlannerPage(page);
			await planner.setup();
			await planner.goto();
			await planner.addStop(PLACES.obelisco);
			await planner.addStop(PLACES.caminito);
			await planner.verifySummary("2 paradas · 10 min · 3 km");

			await planner.createTripButton.click();

			await expect(page.getByText("Viaje en curso")).toBeVisible();
			// en modo viaje no se puede editar: el buscador desaparece
			await expect(planner.searchInput).toBeHidden();

			await page.reload();

			await expect(page.getByText("Viaje en curso")).toBeVisible();
			await planner.verifySummary("2 paradas · 10 min · 3 km");
		},
	);

	test(
		"Ending a trip archives it in the history",
		{ tag: ["@high", "@e2e", "@planner", "@PLANNER-E2E-004"] },
		async ({ page }) => {
			const planner = new PlannerPage(page);
			await planner.setup();
			await planner.goto();
			await planner.addStop(PLACES.obelisco);
			await planner.addStop(PLACES.caminito);
			await planner.verifySummary("2 paradas · 10 min · 3 km");
			await planner.createTripButton.click();

			await planner.endTripButton.click();
			await expect(page.getByText("¿Terminar el viaje?")).toBeVisible();
			await planner.confirmDialog("Terminar viaje");

			await expect(page.getByText("Agregá al menos 2 paradas")).toBeVisible();
			await planner.expandSheet();
			await expect(page.getByText("Viajes anteriores")).toBeVisible();
			await expect(page.getByText(`Desde: ${PLACES.obelisco.label}`)).toBeVisible();
		},
	);

	test(
		"A shared link opens as a received trip and can be saved",
		{ tag: ["@critical", "@e2e", "@planner", "@PLANNER-E2E-005"] },
		async ({ page }) => {
			const planner = new PlannerPage(page);
			await planner.setup();

			await planner.goto(buildShareParam([PLACES.obelisco, PLACES.caminito]));

			await expect(page.getByText("Viaje recibido")).toBeVisible();
			await planner.verifySummary("2 paradas · 10 min · 3 km");

			await planner.saveSharedTripButton.click();

			await expect(page.getByText("Viaje en curso")).toBeVisible();
			await expect(page.getByText("Viaje recibido")).toBeHidden();
		},
	);

	test(
		"An invalid shared link falls back to the editor with a warning",
		{ tag: ["@medium", "@e2e", "@planner", "@PLANNER-E2E-006"] },
		async ({ page }) => {
			const planner = new PlannerPage(page);
			await planner.setup();

			await planner.goto("enlace-invalido");

			await planner.verifyToast("El enlace no es válido");
			await expect(page.getByText("Agregá al menos 2 paradas")).toBeVisible();
		},
	);

	test(
		"Welcome tour shows on the first visit and can be dismissed",
		{ tag: ["@medium", "@e2e", "@planner", "@PLANNER-E2E-007"] },
		async ({ page }) => {
			const planner = new PlannerPage(page);
			await planner.setup({ firstVisit: true });

			await planner.goto();

			await expect(page.getByText("Bienvenido a RutaYa")).toBeVisible();

			await page.getByRole("button", { name: "¡Empezar!" }).click();

			await expect(page.getByText("Bienvenido a RutaYa")).toBeHidden();
		},
	);
});
