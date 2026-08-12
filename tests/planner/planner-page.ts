import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "../base-page";
import { type FixturePlace, mockExternalApis, seedSeenHints } from "../helpers";

export class PlannerPage extends BasePage {
	readonly searchInput: Locator;
	readonly createTripButton: Locator;
	readonly endTripButton: Locator;
	readonly shareButton: Locator;
	readonly saveSharedTripButton: Locator;
	readonly roundtripToggle: Locator;

	constructor(page: Page) {
		super(page);
		this.searchInput = page.getByRole("searchbox");
		this.createTripButton = page.getByRole("button", { name: "Crear viaje" });
		this.endTripButton = page.getByRole("button", { name: "Terminar viaje" });
		this.shareButton = page.getByRole("button", { name: "Compartir" });
		this.saveSharedTripButton = page.getByRole("button", { name: "Guardar como mi viaje" });
		this.roundtripToggle = page.getByRole("checkbox");
	}

	// mocks de red + flags de primera visita; llamar antes de goto()
	async setup({ firstVisit = false } = {}): Promise<void> {
		await mockExternalApis(this.page);
		if (!firstVisit) await seedSeenHints(this.page);
	}

	async goto(shareParam?: string): Promise<void> {
		await super.goto(shareParam ? `/?r=${shareParam}` : "/");
	}

	async addStop(place: FixturePlace): Promise<void> {
		await this.searchInput.click();
		await this.searchInput.fill(place.query);
		await this.page.getByRole("button", { name: place.label }).click();
	}

	// marca una parada de la lista como punto de partida (requiere panel expandido)
	async markOrigin(label: string): Promise<void> {
		await this.page.getByRole("button", { name: `Empezar la ruta desde ${label}` }).click();
	}

	// partida rápida del historial de puntos de inicio (el botón muestra solo el label)
	recentStart(label: string): Locator {
		return this.page.getByRole("button", { name: label, exact: true });
	}

	// el aria-label pisa al texto visible ("Ver paradas") como nombre accesible
	async expandSheet(): Promise<void> {
		await this.page.getByRole("button", { name: "Expandir panel" }).click();
	}

	// el diálogo se monta después del sheet en el DOM, por eso su botón
	// homónimo ("Terminar viaje") es el último con ese nombre accesible
	async confirmDialog(confirmLabel: string): Promise<void> {
		await this.page.getByRole("button", { name: confirmLabel }).last().click();
	}

	async verifySummary(text: string): Promise<void> {
		await expect(this.page.getByText(text)).toBeVisible();
	}

	stopItem(label: string): Locator {
		return this.page.getByRole("listitem").filter({ hasText: label });
	}
}
