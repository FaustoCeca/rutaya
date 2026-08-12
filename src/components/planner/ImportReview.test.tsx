import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ImportRow } from "@/hooks/useFileImport";
import { geocodeImported } from "@/lib/geocoding";
import { ImportReview } from "./ImportReview";

vi.mock("@/lib/geocoding", () => ({ geocodeImported: vi.fn() }));
const mockGeocode = vi.mocked(geocodeImported);

const CENTER = { lat: -32.9442, lng: -60.6505 };

function makeRow(overrides: Partial<ImportRow> = {}): ImportRow {
	return {
		id: crypto.randomUUID(),
		address: "San Martín 500",
		locality: "Rosario",
		located: { label: "San Martín 500, Rosario, Santa Fe", lat: -32.9448, lng: -60.6412 },
		...overrides,
	};
}

function renderReview(rows: ImportRow[], maxToAdd = 30) {
	const onConfirm = vi.fn();
	const onCancel = vi.fn();
	render(
		<ImportReview
			rows={rows}
			center={CENTER}
			maxToAdd={maxToAdd}
			onConfirm={onConfirm}
			onCancel={onCancel}
		/>,
	);
	return { onConfirm, onCancel };
}

afterEach(() => {
	vi.clearAllMocks();
});

describe("ImportReview", () => {
	it("should preview each address with its city before adding", () => {
		renderReview([makeRow(), makeRow({ address: "Mitre 100", locality: "Funes", located: null })]);

		expect(screen.getByText("San Martín 500, Rosario")).toBeInTheDocument();
		expect(screen.getByText("Mitre 100, Funes")).toBeInTheDocument();
		expect(screen.getByText("No se pudo ubicar en el mapa")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Agregar 1 paradas" })).toBeInTheDocument();
	});

	it("should re-locate an edited address and confirm with the new position", async () => {
		const user = userEvent.setup();
		const row = makeRow();
		const relocated = { label: "Avenida San Martín 500, Funes", lat: -32.9165, lng: -60.8098 };
		mockGeocode.mockResolvedValue(relocated);
		const { onConfirm } = renderReview([row]);

		await user.click(screen.getByRole("button", { name: "Editar" }));
		const city = screen.getByRole("textbox", { name: "Ciudad" });
		await user.clear(city);
		await user.type(city, "Funes");
		await user.click(screen.getByRole("button", { name: "Buscar en el mapa" }));

		expect(mockGeocode).toHaveBeenCalledWith("San Martín 500", "Funes", CENTER);
		expect(await screen.findByText("Avenida San Martín 500, Funes")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Agregar 1 paradas" }));
		expect(onConfirm).toHaveBeenCalledWith([
			{ lat: relocated.lat, lng: relocated.lng, label: relocated.label },
		]);
	});

	it("should fix a row that could not be located and select it", async () => {
		const user = userEvent.setup();
		const fixed = { label: "Bartolomé Mitre 100, Funes", lat: -32.91, lng: -60.81 };
		mockGeocode.mockResolvedValue(fixed);
		renderReview([makeRow(), makeRow({ address: "Mitre 100", locality: "", located: null })]);
		expect(screen.getByRole("button", { name: "Agregar 1 paradas" })).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Corregir" }));
		await user.type(screen.getByRole("textbox", { name: "Ciudad" }), "Funes");
		await user.click(screen.getByRole("button", { name: "Buscar en el mapa" }));

		expect(await screen.findByText("Bartolomé Mitre 100, Funes")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Agregar 2 paradas" })).toBeInTheDocument();
	});

	it("should keep the editor open with a message when nothing is found", async () => {
		const user = userEvent.setup();
		mockGeocode.mockResolvedValue(null);
		renderReview([makeRow()]);

		await user.click(screen.getByRole("button", { name: "Editar" }));
		await user.click(screen.getByRole("button", { name: "Buscar en el mapa" }));

		expect(
			await screen.findByText(
				"No encontramos esa dirección. Probá ajustando la calle o la ciudad.",
			),
		).toBeInTheDocument();
		expect(screen.getByRole("textbox", { name: "Dirección" })).toBeInTheDocument();
	});

	it("should discard the edit on cancel", async () => {
		const user = userEvent.setup();
		renderReview([makeRow()]);

		await user.click(screen.getByRole("button", { name: "Editar" }));
		const city = screen.getByRole("textbox", { name: "Ciudad" });
		await user.clear(city);
		await user.type(city, "Otra ciudad");
		await user.click(screen.getByRole("button", { name: "Volver" }));

		expect(screen.getByText("San Martín 500, Rosario")).toBeInTheDocument();
		expect(mockGeocode).not.toHaveBeenCalled();
	});
});
