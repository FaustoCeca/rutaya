import { renderHook, waitFor } from "@testing-library/react";
import { geocodeImported } from "@/lib/geocoding";
import { readImportFile, requestExtraction } from "@/lib/importStops";
import { useFileImport } from "./useFileImport";

vi.mock("@/lib/importStops", () => ({ readImportFile: vi.fn(), requestExtraction: vi.fn() }));
vi.mock("@/lib/geocoding", () => ({ geocodeImported: vi.fn() }));
const mockRead = vi.mocked(readImportFile);
const mockExtract = vi.mocked(requestExtraction);
const mockGeocode = vi.mocked(geocodeImported);

const BIAS = { lat: -32.9442, lng: -60.6505 };
const LOCATED = { label: "San Martín 500, Rosario", lat: -32.9448, lng: -60.6412 };

afterEach(() => {
	vi.clearAllMocks();
});

describe("useFileImport", () => {
	it("should geocode each row with the point resolved by getBias", async () => {
		mockRead.mockResolvedValue({ text: "planilla" });
		mockExtract.mockResolvedValue([{ address: "San Martín 500", locality: "Rosario" }]);
		mockGeocode.mockResolvedValue(LOCATED);
		const getBias = vi.fn().mockResolvedValue(BIAS);

		const { result } = renderHook(() => useFileImport(new File(["x"], "reparto.csv"), getBias));

		await waitFor(() => expect(result.current.phase).toBe("review"));
		expect(mockGeocode).toHaveBeenCalledWith("San Martín 500", "Rosario", BIAS);
		expect(result.current).toMatchObject({
			phase: "review",
			rows: [{ address: "San Martín 500", locality: "Rosario", located: LOCATED }],
			// el punto de sesgo queda disponible para re-geocodificar filas editadas
			center: BIAS,
		});
	});

	it("should keep a row as not located when its geocoding fails", async () => {
		mockRead.mockResolvedValue({ text: "planilla" });
		mockExtract.mockResolvedValue([{ address: "Mitre 100", locality: "" }]);
		mockGeocode.mockRejectedValue(new Error("caída"));
		const getBias = vi.fn().mockResolvedValue(BIAS);

		const { result } = renderHook(() => useFileImport(new File(["x"], "reparto.csv"), getBias));

		await waitFor(() => expect(result.current.phase).toBe("review"));
		expect(result.current).toMatchObject({
			rows: [{ address: "Mitre 100", located: null }],
		});
	});
});
