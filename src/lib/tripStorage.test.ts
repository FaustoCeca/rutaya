import type { RouteState } from "@/hooks/useStops";
import {
	clearActiveTrip,
	loadActiveTrip,
	loadStartHistory,
	loadTripHistory,
	MY_LOCATION_LABEL,
	pushStartHistory,
	pushTripHistory,
	type StoredStart,
	saveActiveTrip,
} from "./tripStorage";

function makeState(label: string, lat = -34.6): RouteState {
	return {
		stops: [
			{ id: "a", label, lat, lng: -58.38 },
			{ id: "b", label: `${label} destino`, lat: lat + 0.05, lng: -58.4 },
		],
		roundtrip: false,
		originId: "a",
	};
}

function makeStart(label: string, lat = -34.6, lng = -58.38): StoredStart {
	return { lat, lng, label };
}

beforeEach(() => {
	localStorage.clear();
});

describe("active trip", () => {
	it("should load what was saved", () => {
		const state = makeState("Obelisco");

		saveActiveTrip(state);
		const loaded = loadActiveTrip();

		expect(loaded).not.toBeNull();
		expect(loaded?.state.stops.map((s) => s.label)).toEqual(["Obelisco", "Obelisco destino"]);
		expect(typeof loaded?.createdAt).toBe("number");
	});

	it("should return null when storage is empty", () => {
		expect(loadActiveTrip()).toBeNull();
	});

	it("should return null for corrupted storage", () => {
		localStorage.setItem("rutaya-active-trip", "{no es json");

		expect(loadActiveTrip()).toBeNull();
	});

	it("should clear the active trip", () => {
		saveActiveTrip(makeState("X"));

		clearActiveTrip();

		expect(loadActiveTrip()).toBeNull();
	});
});

describe("trip history", () => {
	it("should put the newest trip first", () => {
		pushTripHistory(makeState("Primero"));
		pushTripHistory(makeState("Segundo", -34.7));

		const history = loadTripHistory();

		expect(history.map((t) => t.state.stops[0].label)).toEqual(["Segundo", "Primero"]);
	});

	it("should move a repeated trip to the top instead of duplicating it", () => {
		const repeated = makeState("Repetido");
		pushTripHistory(repeated);
		pushTripHistory(makeState("Otro", -34.7));
		pushTripHistory(repeated);

		const history = loadTripHistory();

		expect(history).toHaveLength(2);
		expect(history[0].state.stops[0].label).toBe("Repetido");
	});

	it("should keep at most 5 trips", () => {
		for (let i = 0; i < 7; i++) {
			pushTripHistory(makeState(`Viaje ${i}`, -34 - i));
		}

		const history = loadTripHistory();

		expect(history).toHaveLength(5);
		expect(history[0].state.stops[0].label).toBe("Viaje 6");
	});

	it("should return an empty list for corrupted storage", () => {
		localStorage.setItem("rutaya-trip-history", "asdf");

		expect(loadTripHistory()).toEqual([]);
	});
});

describe("start history", () => {
	it("should put the newest start first", () => {
		pushStartHistory(makeStart("Depósito Flores"));
		pushStartHistory(makeStart("Sucursal Avellaneda", -34.7, -58.4));

		expect(loadStartHistory().map((s) => s.label)).toEqual([
			"Sucursal Avellaneda",
			"Depósito Flores",
		]);
	});

	it("should keep at most 3 starts", () => {
		for (let i = 0; i < 4; i++) {
			pushStartHistory(makeStart(`Partida ${i}`, -34 - i));
		}

		const starts = loadStartHistory();

		expect(starts).toHaveLength(3);
		expect(starts[0].label).toBe("Partida 3");
	});

	it("should move a repeated place (±11 m) to the top instead of duplicating it", () => {
		pushStartHistory(makeStart("Depósito"));
		pushStartHistory(makeStart("Sucursal", -34.7, -58.4));
		pushStartHistory(makeStart("Depósito Central", -34.60005, -58.38005));

		const starts = loadStartHistory();

		expect(starts).toHaveLength(2);
		expect(starts.map((s) => s.label)).toEqual(["Depósito Central", "Sucursal"]);
	});

	it("should not store starts taken from the GPS", () => {
		pushStartHistory(makeStart(MY_LOCATION_LABEL));

		expect(loadStartHistory()).toEqual([]);
	});

	it("should return an empty list for corrupted storage", () => {
		localStorage.setItem("rutaya-start-history", "asdf");

		expect(loadStartHistory()).toEqual([]);
	});
});
