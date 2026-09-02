import type { Stop } from "@/hooks/useStops";

// Las entregas se persisten por índice en state.stops, pero los índices se
// rompen al agregar/quitar/reordenar paradas durante una modificación del
// viaje. Los ids sí son estables mientras la sesión vive en memoria: al entrar
// a modificar se convierten índices → ids, y al guardar se vuelven a índices.

export function deliveredIndicesToIds(stops: Stop[], indices: number[]): string[] {
	return stops.flatMap((s, i) => (indices.includes(i) ? [s.id] : []));
}

// el índice 0 es el origen: nunca se entrega, aunque su id venga en la lista
export function deliveredIdsToIndices(stops: Stop[], ids: string[]): number[] {
	return stops.flatMap((s, i) => (i > 0 && ids.includes(s.id) ? [i] : []));
}
