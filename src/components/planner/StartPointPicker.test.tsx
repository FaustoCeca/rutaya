import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StartPointPicker } from "./StartPointPicker";

const HISTORY = [
	{ lat: -34.6, lng: -58.38, label: "Depósito Flores" },
	{ lat: -34.7, lng: -58.4, label: "Sucursal Avellaneda" },
];

function renderPicker(originLabel: string | null) {
	const onUseMyLocation = vi.fn();
	const onPickStart = vi.fn();
	render(
		<StartPointPicker
			originLabel={originLabel}
			startHistory={HISTORY}
			onUseMyLocation={onUseMyLocation}
			onPickStart={onPickStart}
		/>,
	);
	return { onUseMyLocation, onPickStart };
}

afterEach(() => {
	vi.clearAllMocks();
});

describe("StartPointPicker", () => {
	it("should offer the GPS position and the recent starts when there is no origin", async () => {
		// Given
		const user = userEvent.setup();
		const { onUseMyLocation, onPickStart } = renderPicker(null);
		expect(screen.getByText("¿Desde dónde salís?")).toBeInTheDocument();

		// When
		await user.click(screen.getByRole("button", { name: "Usar mi ubicación actual" }));
		await user.click(screen.getByRole("button", { name: "Depósito Flores" }));

		// Then
		expect(onUseMyLocation).toHaveBeenCalledTimes(1);
		expect(onPickStart).toHaveBeenCalledWith(HISTORY[0]);
	});

	it("should show the chosen origin instead of the options", () => {
		renderPicker("Depósito Flores");

		expect(screen.getByText("Depósito Flores")).toBeInTheDocument();
		expect(screen.getByText(/Salís desde/)).toBeInTheDocument();
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});
});
