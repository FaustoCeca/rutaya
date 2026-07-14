import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchTrip } from "@/lib/osrm";
import type { Stop } from "./useStops";

export function useTrip(stops: Stop[], roundtrip: boolean) {
	const coordsKey = stops.map((s) => `${s.lat.toFixed(5)},${s.lng.toFixed(5)}`).join(";");
	return useQuery({
		queryKey: ["trip", coordsKey, roundtrip],
		queryFn: () => fetchTrip(stops, roundtrip),
		enabled: stops.length >= 2,
		staleTime: Number.POSITIVE_INFINITY,
		placeholderData: keepPreviousData,
	});
}
