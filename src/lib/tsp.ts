// Orden de visita de las paradas sobre una matriz de tiempos (segundos).
// La matriz es asimétrica (calles de un solo sentido), así que los movimientos
// de mejora recalculan el costo real de cada tramo invertido en vez de asumir
// que ir y volver cuestan lo mismo.
//
// El nodo 0 es siempre el origen (la app mantiene el origen en stops[0]).
// - roundtrip=false: camino abierto, puede terminar en cualquier parada
// - roundtrip=true: circuito que vuelve al origen
//
// Con menos de 10 paradas el resultado es el óptimo exacto por fuerza bruta
// (el mismo umbral que usaba OSRM /trip). Desde 10, multi-arranque
// determinista de vecino más cercano refinado con 2-opt y Or-opt.

const BRUTE_FORCE_LIMIT = 10;
// solo se refinan las mejores construcciones: más arranques casi no mejoran
// el resultado y sí el tiempo (importa en celulares de gama baja)
const MAX_REFINED_STARTS = 8;
const EPS = 1e-7;

export function solveTripOrder(durations: number[][], roundtrip: boolean): number[] {
	const n = durations.length;
	if (n <= 2) return Array.from({ length: n }, (_, i) => i);
	if (n < BRUTE_FORCE_LIMIT) return bruteForce(durations, roundtrip);

	// un arranque por cada primer salto posible: diversidad determinista
	const starts = [nearestNeighbor(durations)];
	for (let first = 1; first < n; first++) starts.push(nearestNeighbor(durations, first));
	starts.sort((a, b) => tourCost(a, durations, roundtrip) - tourCost(b, durations, roundtrip));

	let best = starts[0];
	let bestCost = Number.POSITIVE_INFINITY;
	for (const seq of starts.slice(0, MAX_REFINED_STARTS)) {
		const improved = localSearch(seq, durations, roundtrip);
		const cost = tourCost(improved, durations, roundtrip);
		if (cost < bestCost) {
			bestCost = cost;
			best = improved;
		}
	}
	return best;
}

export function tourCost(seq: number[], durations: number[][], roundtrip: boolean): number {
	let cost = 0;
	for (let i = 0; i < seq.length - 1; i++) cost += durations[seq[i]][seq[i + 1]];
	return roundtrip ? cost + durations[seq[seq.length - 1]][seq[0]] : cost;
}

function bruteForce(d: number[][], roundtrip: boolean): number[] {
	const rest = Array.from({ length: d.length - 1 }, (_, i) => i + 1);
	let best = [0, ...rest];
	let bestCost = tourCost(best, d, roundtrip);
	const permute = (k: number) => {
		if (k === rest.length) {
			const seq = [0, ...rest];
			const cost = tourCost(seq, d, roundtrip);
			if (cost < bestCost) {
				bestCost = cost;
				best = seq;
			}
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

function nearestNeighbor(d: number[][], forcedFirst?: number): number[] {
	const n = d.length;
	const visited = new Array<boolean>(n).fill(false);
	const seq = [0];
	visited[0] = true;
	if (forcedFirst !== undefined) {
		seq.push(forcedFirst);
		visited[forcedFirst] = true;
	}
	while (seq.length < n) {
		const last = seq[seq.length - 1];
		let next = -1;
		for (let j = 0; j < n; j++) {
			if (!visited[j] && (next === -1 || d[last][j] < d[last][next])) next = j;
		}
		seq.push(next);
		visited[next] = true;
	}
	return seq;
}

function localSearch(start: number[], d: number[][], roundtrip: boolean): number[] {
	const seq = [...start];
	let improved = true;
	while (improved) {
		improved = false;
		if (twoOptPass(seq, d, roundtrip)) improved = true;
		if (orOptPass(seq, d, roundtrip)) improved = true;
	}
	return seq;
}

// 2-opt: invierte el tramo seq[i..j]. Los prefijos fwd/bwd (costo de recorrer
// la secuencia hacia adelante y hacia atrás) permiten evaluar en O(1) cuánto
// cuesta el tramo invertido, que en una matriz asimétrica no es gratis.
function twoOptPass(seq: number[], d: number[][], roundtrip: boolean): boolean {
	const n = seq.length;
	let anyImprovement = false;
	const fwd = new Array<number>(n).fill(0);
	const bwd = new Array<number>(n).fill(0);
	const rebuild = () => {
		for (let k = 0; k < n - 1; k++) {
			fwd[k + 1] = fwd[k] + d[seq[k]][seq[k + 1]];
			bwd[k + 1] = bwd[k] + d[seq[k + 1]][seq[k]];
		}
	};
	rebuild();
	for (let i = 1; i < n - 1; i++) {
		for (let j = i + 1; j < n; j++) {
			const before = seq[i - 1];
			const after = j === n - 1 ? (roundtrip ? seq[0] : -1) : seq[j + 1];
			const removed = d[before][seq[i]] + (after >= 0 ? d[seq[j]][after] : 0);
			const added = d[before][seq[j]] + (after >= 0 ? d[seq[i]][after] : 0);
			const innerDelta = bwd[j] - bwd[i] - (fwd[j] - fwd[i]);
			if (added + innerDelta - removed < -EPS) {
				reverseInPlace(seq, i, j);
				rebuild();
				anyImprovement = true;
			}
		}
	}
	return anyImprovement;
}

// Or-opt: reubica un tramo de 1 a 3 paradas sin invertirlo (delta en O(1)).
// Devuelve al primer movimiento aplicado: los índices quedan viejos y el
// while de localSearch vuelve a barrer.
function orOptPass(seq: number[], d: number[][], roundtrip: boolean): boolean {
	const n = seq.length;
	for (let len = 1; len <= 3; len++) {
		for (let i = 1; i + len - 1 <= n - 1; i++) {
			const j = i + len - 1;
			const prev = seq[i - 1];
			const first = seq[i];
			const last = seq[j];
			const next = j === n - 1 ? (roundtrip ? seq[0] : -1) : seq[j + 1];
			const removedBridge = d[prev][first] + (next >= 0 ? d[last][next] : 0);
			const closedGap = next >= 0 ? d[prev][next] : 0;
			for (let p = 0; p < n; p++) {
				if (p >= i - 1 && p <= j) continue;
				const x = seq[p];
				const y = p === n - 1 ? (roundtrip ? seq[0] : -1) : seq[p + 1];
				const added = d[x][first] + (y >= 0 ? d[last][y] - d[x][y] : 0);
				if (closedGap - removedBridge + added < -EPS) {
					moveSegment(seq, i, len, p);
					return true;
				}
			}
		}
	}
	return false;
}

function reverseInPlace(seq: number[], i: number, j: number): void {
	for (let a = i, b = j; a < b; a++, b--) {
		[seq[a], seq[b]] = [seq[b], seq[a]];
	}
}

// saca el tramo [i, i+len) y lo inserta después de la posición original p
function moveSegment(seq: number[], i: number, len: number, p: number): void {
	const segment = seq.splice(i, len);
	const insertAt = p < i ? p + 1 : p - len + 1;
	seq.splice(insertAt, 0, ...segment);
}
