import { getCurrentPosition } from "./geolocation";

const mockGetCurrentPosition = vi.fn();

beforeEach(() => {
	vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: mockGetCurrentPosition } });
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

describe("getCurrentPosition", () => {
	it("should forward the high-accuracy defaults to the native API", () => {
		void getCurrentPosition();

		expect(mockGetCurrentPosition).toHaveBeenCalledWith(
			expect.any(Function),
			expect.any(Function),
			{
				enableHighAccuracy: true,
				timeout: 8000,
			},
		);
	});

	it("should forward explicit options verbatim", () => {
		const options = { enableHighAccuracy: false, timeout: 5000, maximumAge: 60_000 };

		void getCurrentPosition(options);

		expect(mockGetCurrentPosition).toHaveBeenCalledWith(
			expect.any(Function),
			expect.any(Function),
			options,
		);
	});

	it("should map the native coords to {lat, lng}", async () => {
		mockGetCurrentPosition.mockImplementation((success: PositionCallback) =>
			success({ coords: { latitude: -32.9442, longitude: -60.6505 } } as GeolocationPosition),
		);

		await expect(getCurrentPosition()).resolves.toEqual({ lat: -32.9442, lng: -60.6505 });
	});

	it("should reject when geolocation is unsupported", async () => {
		vi.stubGlobal("navigator", {});

		await expect(getCurrentPosition()).rejects.toThrow("Geolocalización no soportada");
	});
});
