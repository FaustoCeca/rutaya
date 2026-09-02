import type { Stop } from "@/hooks/useStops";
import { deliveredIdsToIndices, deliveredIndicesToIds } from "./deliveredMarks";

function makeStops(ids: string[]): Stop[] {
	return ids.map((id, i) => ({ id, label: `Parada ${id}`, lat: -34.6 - i * 0.01, lng: -58.38 }));
}

describe("deliveredIndicesToIds", () => {
	it("should pick the ids of the delivered stops", () => {
		const stops = makeStops(["a", "b", "c"]);

		expect(deliveredIndicesToIds(stops, [1, 2])).toEqual(["b", "c"]);
		expect(deliveredIndicesToIds(stops, [])).toEqual([]);
	});
});

describe("deliveredIdsToIndices", () => {
	it("should remap ids to their new positions after edits shift them", () => {
		// "c" estaba entregada en el índice 2; tras borrar "b" queda en el 1
		const stops = makeStops(["a", "c", "d"]);

		expect(deliveredIdsToIndices(stops, ["c"])).toEqual([1]);
	});

	it("should drop ids of removed stops and ignore new stops", () => {
		const stops = makeStops(["a", "d", "e"]);

		expect(deliveredIdsToIndices(stops, ["b", "c"])).toEqual([]);
	});

	it("should never mark the origin even when its id is listed", () => {
		// una parada entregada promovida a origen pierde la marca (el origen no se entrega)
		const stops = makeStops(["c", "a", "b"]);

		expect(deliveredIdsToIndices(stops, ["c", "b"])).toEqual([2]);
	});
});
