import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SheetActions } from "./SheetActions";

const NEXT_STOP = { id: "b", label: "Caminito, La Boca", lat: -34.63, lng: -58.36 };

function renderActions(overrides: Partial<Parameters<typeof SheetActions>[0]> = {}) {
	const onModify = vi.fn();
	render(
		<SheetActions
			mode="trip"
			isPreview={false}
			canCreate={false}
			mapsLegs={[]}
			nextStop={undefined}
			allDelivered={false}
			originStop={undefined}
			isModifying={false}
			onModify={onModify}
			onShare={vi.fn()}
			onCreate={vi.fn()}
			onSave={vi.fn()}
			onEnd={vi.fn()}
			onImportFile={vi.fn()}
			{...overrides}
		/>,
	);
	return { onModify };
}

describe("SheetActions", () => {
	it("should link the next stop without an origin so Maps starts from the current location", () => {
		renderActions({ nextStop: NEXT_STOP });

		const link = screen.getByRole("link", { name: /Ir a la próxima parada/ });
		expect(link).toHaveTextContent("Caminito, La Boca");
		const params = new URL(link.getAttribute("href") ?? "").searchParams;
		expect(params.get("destination")).toBe("-34.63,-58.36");
		expect(params.has("origin")).toBe(false);
	});

	it("should disable the next-stop button while the visit order is not available", () => {
		renderActions();

		expect(screen.getByRole("button", { name: "Ir a la próxima parada" })).toBeDisabled();
		expect(screen.queryByRole("link", { name: /Ir a la próxima parada/ })).not.toBeInTheDocument();
	});

	it("should celebrate when everything was delivered", () => {
		renderActions({ allDelivered: true });

		expect(screen.getByText(/¡Todas las paradas entregadas!/)).toBeInTheDocument();
		expect(screen.queryByText("Ir a la próxima parada")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Terminar viaje" })).toBeInTheDocument();
	});

	it("should offer the way back to the origin when a roundtrip is complete", () => {
		const origin = { id: "a", label: "Depósito Flores", lat: -34.6, lng: -58.38 };
		renderActions({ allDelivered: true, originStop: origin });

		const link = screen.getByRole("link", { name: /Volver al origen/ });
		const params = new URL(link.getAttribute("href") ?? "").searchParams;
		expect(params.get("destination")).toBe("-34.6,-58.38");
		expect(params.has("origin")).toBe(false);
	});

	it("should not show the delivery actions on a received trip", () => {
		renderActions({ isPreview: true, nextStop: NEXT_STOP });

		expect(screen.queryByText("Ir a la próxima parada")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Guardar como mi viaje" })).toBeInTheDocument();
	});

	it("should offer to modify the active trip but never a received one", async () => {
		// Given
		const user = userEvent.setup();
		const { onModify } = renderActions();

		// When
		await user.click(screen.getByRole("button", { name: "Modificar viaje" }));

		// Then
		expect(onModify).toHaveBeenCalledTimes(1);
	});

	it("should hide the modify button on a received trip", () => {
		renderActions({ isPreview: true });

		expect(screen.queryByRole("button", { name: "Modificar viaje" })).not.toBeInTheDocument();
	});

	it("should relabel the edit CTA to save while modifying a trip", () => {
		renderActions({ mode: "edit", isModifying: true });

		expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Crear viaje" })).not.toBeInTheDocument();
	});

	it("should keep the create CTA in a plain edit session", () => {
		renderActions({ mode: "edit" });

		expect(screen.getByRole("button", { name: "Crear viaje" })).toBeInTheDocument();
	});
});
