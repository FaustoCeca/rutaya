import { formatDistance, formatDuration } from "@/lib/format";
import type { TripResult } from "@/lib/osrm";

interface RouteSummaryProps {
	stopCount: number;
	trip: TripResult | undefined;
	isFetching: boolean;
	isError: boolean;
	onRetry: () => void;
}

export function RouteSummary({ stopCount, trip, isFetching, isError, onRetry }: RouteSummaryProps) {
	if (stopCount < 2) {
		return (
			<div className="px-4 pb-3">
				<p className="font-medium text-gray-900">Agregá al menos 2 paradas</p>
				<p className="text-gray-500 text-sm">Tocá el mapa o buscá una dirección</p>
			</div>
		);
	}
	if (isError) {
		return (
			<div className="flex items-center justify-between gap-3 px-4 pb-3">
				<p className="font-medium text-red-600">No se pudo calcular la ruta</p>
				<button
					type="button"
					onClick={onRetry}
					className="rounded-full bg-gray-900 px-4 py-1.5 font-medium text-sm text-white"
				>
					Reintentar
				</button>
			</div>
		);
	}
	if (!trip) {
		return <p className="animate-pulse px-4 pb-3 text-gray-500">Calculando ruta…</p>;
	}
	return (
		<div className="flex items-center gap-2 px-4 pb-3">
			<p className="font-semibold text-gray-900">
				{stopCount} paradas · {formatDuration(trip.totalDuration)} ·{" "}
				{formatDistance(trip.totalDistance)}
			</p>
			{isFetching && (
				<span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" aria-hidden="true" />
			)}
		</div>
	);
}
