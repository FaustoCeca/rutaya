import { act, renderHook } from "@testing-library/react";
import { findNearStop, isNearDuplicate, type RouteState, type Stop, useStops } from "./useStops";

function stop(id: string, lat: number, lng: number): Stop {
	return { id, label: `Parada ${id}`, lat, lng };
}

const EMPTY: RouteState = { stops: [], roundtrip: false, originId: null };

describe("isNearDuplicate", () => {
	it("should flag a point within ~11 m of an existing stop", () => {
		const stops = [stop("a", -34.6, -58.38)];

		expect(isNearDuplicate(stops, -34.60005, -58.38005)).toBe(true);
	});

	it("should accept a point farther away", () => {
		const stops = [stop("a", -34.6, -58.38)];

		expect(isNearDuplicate(stops, -34.601, -58.38)).toBe(false);
		expect(isNearDuplicate([], -34.6, -58.38)).toBe(false);
	});
});

describe("findNearStop", () => {
	it("should return the stop within ~11 m", () => {
		const stops = [stop("a", -34.6, -58.38), stop("b", -34.7, -58.4)];

		expect(findNearStop(stops, -34.70005, -58.40005)?.id).toBe("b");
	});

	it("should return undefined when nothing is near", () => {
		const stops = [stop("a", -34.6, -58.38)];

		expect(findNearStop(stops, -34.601, -58.38)).toBeUndefined();
	});
});

describe("useStops reducer", () => {
	it("should append stops on add", () => {
		const { result } = renderHook(() => useStops(EMPTY));

		act(() => result.current.dispatch({ type: "add", stop: stop("a", -34.6, -58.38) }));
		act(() => result.current.dispatch({ type: "add", stop: stop("b", -34.7, -58.4) }));

		expect(result.current.state.stops.map((s) => s.id)).toEqual(["a", "b"]);
	});

	it("should remove a stop by id", () => {
		const initial = {
			stops: [stop("a", -34.6, -58.38), stop("b", -34.7, -58.4)],
			roundtrip: false,
			originId: null,
		};
		const { result } = renderHook(() => useStops(initial));

		act(() => result.current.dispatch({ type: "remove", id: "a" }));

		expect(result.current.state.stops.map((s) => s.id)).toEqual(["b"]);
	});

	it("should clear the origin when the origin stop is removed", () => {
		const initial = {
			stops: [stop("a", -34.6, -58.38), stop("b", -34.7, -58.4)],
			roundtrip: false,
			originId: "a",
		};
		const { result } = renderHook(() => useStops(initial));

		act(() => result.current.dispatch({ type: "remove", id: "a" }));

		expect(result.current.state.originId).toBeNull();
	});

	it("should keep the origin when another stop is removed", () => {
		const initial = {
			stops: [stop("a", -34.6, -58.38), stop("b", -34.7, -58.4)],
			roundtrip: false,
			originId: "a",
		};
		const { result } = renderHook(() => useStops(initial));

		act(() => result.current.dispatch({ type: "remove", id: "b" }));

		expect(result.current.state.originId).toBe("a");
	});

	it("should move the chosen stop to the front and mark it as origin on makeOrigin", () => {
		const initial = {
			stops: [stop("a", -34.6, -58.38), stop("b", -34.7, -58.4), stop("c", -34.8, -58.5)],
			roundtrip: false,
			originId: null,
		};
		const { result } = renderHook(() => useStops(initial));

		act(() => result.current.dispatch({ type: "makeOrigin", id: "c" }));

		expect(result.current.state.stops.map((s) => s.id)).toEqual(["c", "a", "b"]);
		expect(result.current.state.originId).toBe("c");
	});

	it("should ignore makeOrigin for an unknown id", () => {
		const initial = { stops: [stop("a", -34.6, -58.38)], roundtrip: false, originId: null };
		const { result } = renderHook(() => useStops(initial));

		act(() => result.current.dispatch({ type: "makeOrigin", id: "zzz" }));

		expect(result.current.state.stops.map((s) => s.id)).toEqual(["a"]);
		expect(result.current.state.originId).toBeNull();
	});

	it("should relabel only the matching stop", () => {
		const initial = {
			stops: [stop("a", -34.6, -58.38), stop("b", -34.7, -58.4)],
			roundtrip: false,
			originId: null,
		};
		const { result } = renderHook(() => useStops(initial));

		act(() => result.current.dispatch({ type: "relabel", id: "b", label: "Nueva" }));

		expect(result.current.state.stops.map((s) => s.label)).toEqual(["Parada a", "Nueva"]);
	});

	it("should toggle roundtrip", () => {
		const { result } = renderHook(() => useStops(EMPTY));

		act(() => result.current.dispatch({ type: "toggleRoundtrip" }));

		expect(result.current.state.roundtrip).toBe(true);
	});

	it("should reset to an empty one-way state without origin", () => {
		const initial = { stops: [stop("a", -34.6, -58.38)], roundtrip: true, originId: "a" };
		const { result } = renderHook(() => useStops(initial));

		act(() => result.current.dispatch({ type: "reset" }));

		expect(result.current.state).toEqual(EMPTY);
	});

	it("should replace the whole state on hydrate", () => {
		const { result } = renderHook(() => useStops(EMPTY));
		const next = { stops: [stop("z", -34.9, -58.6)], roundtrip: true, originId: "z" };

		act(() => result.current.dispatch({ type: "hydrate", state: next }));

		expect(result.current.state).toEqual(next);
	});
});
