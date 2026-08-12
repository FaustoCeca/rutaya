import { act, renderHook, waitFor } from "@testing-library/react";
import { getCurrentPosition } from "@/lib/geolocation";
import { useUserLocation } from "./useUserLocation";

vi.mock("@/lib/geolocation", () => ({ getCurrentPosition: vi.fn() }));
const mockGetPosition = vi.mocked(getCurrentPosition);

const ROSARIO = { lat: -32.9442, lng: -60.6505 };
const CORDOBA = { lat: -31.4201, lng: -64.1888 };

afterEach(() => {
	vi.clearAllMocks();
});

describe("useUserLocation", () => {
	it("should store the startup fix using the low-accuracy bias options", async () => {
		mockGetPosition.mockResolvedValue(ROSARIO);
		const { result } = renderHook(() => useUserLocation());

		act(() => result.current.requestStartupLocation());

		await waitFor(() => expect(result.current.startupFix).toEqual(ROSARIO));
		expect(result.current.locationRef.current).toEqual(ROSARIO);
		expect(mockGetPosition).toHaveBeenCalledWith({
			enableHighAccuracy: false,
			timeout: 5000,
			maximumAge: 60_000,
		});
	});

	it("should request the position only once even if invoked repeatedly", async () => {
		mockGetPosition.mockResolvedValue(ROSARIO);
		const { result } = renderHook(() => useUserLocation());

		act(() => result.current.requestStartupLocation());
		act(() => result.current.requestStartupLocation());

		await waitFor(() => expect(result.current.startupFix).toEqual(ROSARIO));
		expect(mockGetPosition).toHaveBeenCalledTimes(1);
	});

	it("should stay silent when the permission is denied", async () => {
		mockGetPosition.mockRejectedValue(new Error("denegado"));
		const { result } = renderHook(() => useUserLocation());

		await act(async () => result.current.requestStartupLocation());

		expect(result.current.startupFix).toBeNull();
		expect(result.current.locationRef.current).toBeNull();
	});

	it("should refresh the stored fix with getFreshLocation", async () => {
		mockGetPosition.mockResolvedValue(CORDOBA);
		const { result } = renderHook(() => useUserLocation());

		await expect(result.current.getFreshLocation()).resolves.toEqual(CORDOBA);

		expect(result.current.locationRef.current).toEqual(CORDOBA);
	});

	it("should fall back to the last known fix when the refresh fails", async () => {
		const { result } = renderHook(() => useUserLocation());
		result.current.recordLocation(ROSARIO);
		mockGetPosition.mockRejectedValue(new Error("sin señal"));

		await expect(result.current.getFreshLocation()).resolves.toEqual(ROSARIO);
	});

	it("should resolve null when the refresh fails without a previous fix", async () => {
		mockGetPosition.mockRejectedValue(new Error("sin señal"));
		const { result } = renderHook(() => useUserLocation());

		await expect(result.current.getFreshLocation()).resolves.toBeNull();
	});
});
