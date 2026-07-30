import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./ConfirmDialog";

function renderDialog() {
	const onConfirm = vi.fn();
	const onCancel = vi.fn();
	render(
		<ConfirmDialog
			message="¿Terminar el viaje?"
			confirmLabel="Terminar viaje"
			onConfirm={onConfirm}
			onCancel={onCancel}
		/>,
	);
	return { onConfirm, onCancel };
}

afterEach(() => {
	vi.clearAllMocks();
});

describe("ConfirmDialog", () => {
	it("should show the message and confirm with the custom label", async () => {
		// Given
		const user = userEvent.setup();
		const { onConfirm, onCancel } = renderDialog();
		expect(screen.getByText("¿Terminar el viaje?")).toBeInTheDocument();

		// When
		await user.click(screen.getByRole("button", { name: "Terminar viaje" }));

		// Then
		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect(onCancel).not.toHaveBeenCalled();
	});

	it("should cancel from the footer button", async () => {
		// Given
		const user = userEvent.setup();
		const { onConfirm, onCancel } = renderDialog();

		// When — el botón con texto visible, no el backdrop (que solo tiene aria-label)
		await user.click(screen.getByText("Cancelar"));

		// Then
		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it("should cancel when tapping the backdrop", async () => {
		// Given
		const user = userEvent.setup();
		const { onCancel } = renderDialog();
		const backdrop = screen
			.getAllByRole("button", { name: "Cancelar" })
			.find((b) => b.getAttribute("aria-label") === "Cancelar");

		// When
		if (!backdrop) throw new Error("backdrop no encontrado");
		await user.click(backdrop);

		// Then
		expect(onCancel).toHaveBeenCalledTimes(1);
	});
});
