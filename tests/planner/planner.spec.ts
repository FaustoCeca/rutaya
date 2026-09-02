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
			// sin punto de partida elegido no se puede crear el viaje
			await expect(page.getByText("¿Desde dónde salís?")).toBeVisible();
			await expect(planner.createTripButton).toBeDisabled();

			await planner.expandSheet();
			await planner.markOrigin(PLACES.obelisco.label);

			await expect(planner.stopItem(PLACES.obelisco.label)).toContainText("Origen");
			await expect(planner.stopItem(PLACES.caminito.label)).toBeVisible();
			await expect(page.getByText(`Salís desde ${PLACES.obelisco.label}`)).toBeVisible();
			await expect(planner.createTripButton).toBeEnabled();
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
			await planner.expandSheet();
			await planner.markOrigin(PLACES.obelisco.label);

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
			await planner.expandSheet();
			await planner.markOrigin(PLACES.obelisco.label);
			await planner.createTripButton.click();

			await planner.endTripButton.click();
			await expect(page.getByText("¿Terminar el viaje?")).toBeVisible();
			await planner.confirmDialog("Terminar viaje");

			await expect(page.getByText("Agregá al menos 2 paradas")).toBeVisible();
			// el panel quedó expandido desde que se marcó el origen
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

			// un viaje recibido no expone la UI de entregas
			await expect(page.getByText(/Entregadas/)).toBeHidden();
			await expect(page.getByRole("checkbox")).toHaveCount(0);
			await expect(planner.nextStopLink).toBeHidden();

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
		"The chosen start point is offered again for the next trip",
		{ tag: ["@high", "@e2e", "@planner", "@PLANNER-E2E-008"] },
		async ({ page }) => {
			const planner = new PlannerPage(page);
			await planner.setup();
			await planner.goto();
			await planner.addStop(PLACES.obelisco);
			await planner.addStop(PLACES.caminito);
			await planner.verifySummary("2 paradas · 10 min · 3 km");
			await planner.expandSheet();
			await planner.markOrigin(PLACES.obelisco.label);
			await planner.createTripButton.click();
			await planner.endTripButton.click();
			await planner.confirmDialog("Terminar viaje");

			// de vuelta en el editor, el origen del viaje anterior es partida rápida
			await expect(page.getByText("¿Desde dónde salís?")).toBeVisible();
			await planner.recentStart(PLACES.obelisco.label).click();

			await expect(page.getByText(`Salís desde ${PLACES.obelisco.label}`)).toBeVisible();
		},
	);

	test(
		"Marking deliveries updates the progress and the next stop, surviving a reload",
		{ tag: ["@critical", "@e2e", "@planner", "@PLANNER-E2E-009"] },
		async ({ page }) => {
			const planner = new PlannerPage(page);
			await planner.setup();
			await planner.goto();
			await planner.addStop(PLACES.obelisco);
			await planner.addStop(PLACES.caminito);
			await planner.addStop(PLACES.congreso);
			await planner.verifySummary("3 paradas · 20 min · 6 km");
			await planner.expandSheet();
			await planner.markOrigin(PLACES.obelisco.label);
			await planner.createTripButton.click();

			// con las duraciones mockeadas uniformes el orden de visita es el de carga
			await expect(page.getByText("Entregadas 0 de 2")).toBeVisible();
			await expect(planner.nextStopLink).toContainText(PLACES.caminito.label);

			await planner.deliveredToggle(PLACES.caminito.label).check();

			await expect(page.getByText("Entregadas 1 de 2")).toBeVisible();
			await expect(planner.nextStopLink).toContainText(PLACES.congreso.label);
			// navega solo con destino: Maps arranca desde donde esté el repartidor
			const href = await planner.nextStopLink.getAttribute("href");
			expect(href).toContain("destination=");
			expect(href).not.toContain("origin=");

			await page.reload();

			// la lista se auto-expande en viaje en curso: las marcas siguen ahí
			await expect(page.getByText("Entregadas 1 de 2")).toBeVisible();
			await expect(planner.deliveredToggle(PLACES.caminito.label)).toBeChecked();

			await planner.deliveredToggle(PLACES.caminito.label).uncheck();

			await expect(page.getByText("Entregadas 0 de 2")).toBeVisible();
			await expect(planner.nextStopLink).toContainText(PLACES.caminito.label);
		},
	);

	test(
		"Delivering every stop suggests ending the trip and a new trip starts clean",
		{ tag: ["@high", "@e2e", "@planner", "@PLANNER-E2E-010"] },
		async ({ page }) => {
			const planner = new PlannerPage(page);
			await planner.setup();
			await planner.goto();
			await planner.addStop(PLACES.obelisco);
			await planner.addStop(PLACES.caminito);
			await planner.verifySummary("2 paradas · 10 min · 3 km");
			await planner.expandSheet();
			await planner.markOrigin(PLACES.obelisco.label);
			await planner.createTripButton.click();
			await expect(page.getByText("Entregadas 0 de 1")).toBeVisible();

			await planner.deliveredToggle(PLACES.caminito.label).check();

			await expect(page.getByText("Entregadas 1 de 1")).toBeVisible();
			await expect(page.getByText("¡Todas las paradas entregadas!")).toBeVisible();
			await expect(planner.nextStopLink).toBeHidden();

			await planner.endTripButton.click();
			await planner.confirmDialog("Terminar viaje");

			// mismo viaje de nuevo (partida rápida evita duplicar el botón del buscador)
			await planner.recentStart(PLACES.obelisco.label).click();
			await planner.addStop(PLACES.caminito);
			await planner.verifySummary("2 paradas · 10 min · 3 km");
			await planner.createTripButton.click();

			// las entregas del viaje anterior no se heredan
			await expect(page.getByText("Entregadas 0 de 1")).toBeVisible();
			await expect(planner.deliveredToggle(PLACES.caminito.label)).not.toBeChecked();
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
