import { decodeRouteState, sameRoute } from "@/lib/share";
import { loadActiveTrip } from "@/lib/tripStorage";
import type { RouteState } from "./useStops";
import type { PlannerMode } from "./useTripLifecycle";

export interface InitialModel {
	routeState: RouteState;
	mode: PlannerMode;
	isPreview: boolean;
	invalidLink: boolean;
	delivered: number[];
}

export function buildInitialModel(r: string | undefined): InitialModel {
	const empty: RouteState = { stops: [], roundtrip: false, originId: null };
	const active = loadActiveTrip();
	if (r) {
		const linked = decodeRouteState(r);
		if (linked && linked.stops.length >= 2) {
			const matchesActive = active !== null && sameRoute(linked, active.state);
			return {
				routeState: linked,
				mode: "trip",
				isPreview: !matchesActive,
				invalidLink: false,
				// mismo viaje que el activo: los índices entregados siguen valiendo
				// porque sameRoute garantiza el mismo orden de paradas
				delivered: matchesActive ? active.delivered : [],
			};
		}
		// enlace roto: caer al viaje activo si hay, si no al editor vacío
		return active
			? {
					routeState: active.state,
					mode: "trip",
					isPreview: false,
					invalidLink: true,
					delivered: active.delivered,
				}
			: { routeState: empty, mode: "edit", isPreview: false, invalidLink: true, delivered: [] };
	}
	if (active) {
		return {
			routeState: active.state,
			mode: "trip",
			isPreview: false,
			invalidLink: false,
			delivered: active.delivered,
		};
	}
	return { routeState: empty, mode: "edit", isPreview: false, invalidLink: false, delivered: [] };
}
