import { solveTripOrder, tourCost } from "./tsp";

// matriz determinista pseudoaleatoria (LCG) con asimetría, tiempos 60-1860 s
function seededMatrix(n: number, seed: number): number[][] {
	let s = seed;
	const rand = () => {
		s = (s * 1664525 + 1013904223) % 2 ** 32;
		return s / 2 ** 32;
	};
	return Array.from({ length: n }, (_, i) =>
		Array.from({ length: n }, (_, j) => (i === j ? 0 : 60 + Math.floor(rand() * 1800))),
	);
}

// referencia exacta independiente para validar el solver
function optimalCost(d: number[][], roundtrip: boolean): number {
	const rest = Array.from({ length: d.length - 1 }, (_, i) => i + 1);
	let best = Number.POSITIVE_INFINITY;
	const permute = (k: number) => {
		if (k === rest.length) {
			best = Math.min(best, tourCost([0, ...rest], d, roundtrip));
			return;
		}
		for (let i = k; i < rest.length; i++) {
			[rest[k], rest[i]] = [rest[i], rest[k]];
			permute(k + 1);
			[rest[k], rest[i]] = [rest[i], rest[k]];
		}
	};
	permute(0);
	return best;
}

function circleMatrix(n: number): number[][] {
	const points = Array.from({ length: n }, (_, k) => {
		const angle = (2 * Math.PI * k) / n;
		return [Math.cos(angle), Math.sin(angle)];
	});
	return points.map(([x1, y1]) => points.map(([x2, y2]) => Math.hypot(x2 - x1, y2 - y1)));
}

describe("solveTripOrder", () => {
	it("should return trivial orders for 1 and 2 stops", () => {
		expect(solveTripOrder([[0]], false)).toEqual([0]);
		expect(
			solveTripOrder(
				[
					[0, 5],
					[5, 0],
				],
				false,
			),
		).toEqual([0, 1]);
	});

	it("should always start at the origin and visit every stop exactly once", () => {
		const d = seededMatrix(12, 42);

		const seq = solveTripOrder(d, false);

		expect(seq[0]).toBe(0);
		expect([...seq].sort((a, b) => a - b)).toEqual(Array.from({ length: 12 }, (_, i) => i));
	});

	it("should find the exact optimum below 10 stops", () => {
		const crafted = [
			[0, 1000, 100],
			[1000, 0, 1000],
			[150, 100, 0],
		];
		expect(solveTripOrder(crafted, false)).toEqual([0, 2, 1]);

		const d = seededMatrix(8, 7);
		expect(tourCost(solveTripOrder(d, false), d, false)).toBe(optimalCost(d, false));
		expect(tourCost(solveTripOrder(d, true), d, true)).toBe(optimalCost(d, true));
	});

	it("should account for the return leg when choosing a roundtrip order", () => {
		// abierto conviene terminar en 2; en circuito la vuelta 2→0 es carísima
		const d = [
			[0, 10, 11],
			[10, 0, 2],
			[100, 2, 0],
		];

		expect(solveTripOrder(d, false)).toEqual([0, 1, 2]);
		expect(solveTripOrder(d, true)).toEqual([0, 2, 1]);
	});

	it("should stay within 5% of the optimum on heuristic-sized trips", () => {
		const d = seededMatrix(10, 123);

		const cost = tourCost(solveTripOrder(d, false), d, false);

		expect(cost).toBeLessThanOrEqual(optimalCost(d, false) * 1.05);
	});

	it("should follow the ring on points laid out in a circle", () => {
		const n = 12;
		const d = circleMatrix(n);
		const chord = 2 * Math.sin(Math.PI / n);

		const openCost = tourCost(solveTripOrder(d, false), d, false);
		const loopCost = tourCost(solveTripOrder(d, true), d, true);

		// el óptimo es recorrer el anillo en orden: n-1 cuerdas (abierto) o n (circuito)
		expect(openCost).toBeCloseTo((n - 1) * chord, 9);
		expect(loopCost).toBeCloseTo(n * chord, 9);
	});

	it("should solve the 30-stop maximum fast", () => {
		const d = seededMatrix(30, 999);

		const startedAt = performance.now();
		const seq = solveTripOrder(d, false);
		const elapsed = performance.now() - startedAt;

		expect([...seq].sort((a, b) => a - b)).toEqual(Array.from({ length: 30 }, (_, i) => i));
		// el orden ingenuo (0,1,2,...) es la cota mínima de sensatez
		const naive = Array.from({ length: 30 }, (_, i) => i);
		expect(tourCost(seq, d, false)).toBeLessThan(tourCost(naive, d, false));
		expect(elapsed).toBeLessThan(250);
	});
});
