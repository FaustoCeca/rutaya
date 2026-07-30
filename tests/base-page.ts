import { expect, type Page } from "@playwright/test";

export class BasePage {
	constructor(protected page: Page) {}

	async goto(path: string): Promise<void> {
		await this.page.goto(path);
	}

	// el Toast de la app renderiza un <output> (role="status")
	async verifyToast(message: string): Promise<void> {
		await expect(this.page.getByRole("status")).toContainText(message);
	}
}
