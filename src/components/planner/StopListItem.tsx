import type { Stop } from "@/hooks/useStops";
import { formatDistance, formatDuration } from "@/lib/format";
import type { TripLeg } from "@/lib/osrm";

interface StopListItemProps {
	stop: Stop;
	visitNumber: number;
	isOrigin: boolean;
	// tramo que llega a esta parada desde la anterior (undefined para el origen)
	leg: TripLeg | undefined;
	// viaje confirmado: la fila se muestra sin acciones
	readonly: boolean;
	onRemove: () => void;
	onMakeOrigin: () => void;
}

export function StopListItem({
	stop,
	visitNumber,
	isOrigin,
	leg,
	readonly,
	onRemove,
	onMakeOrigin,
}: StopListItemProps) {
	return (
		<li className="flex items-center gap-3 px-4 py-2.5">
			<span
				className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold text-sm text-white ${isOrigin ? "bg-emerald-600" : "bg-blue-600"}`}
			>
				{visitNumber}
			</span>
			<div className="min-w-0 flex-1">
				<p className="truncate text-gray-900 text-sm">{stop.label}</p>
				{isOrigin ? (
					<p className="font-medium text-emerald-700 text-xs">Origen</p>
				) : (
					leg && (
						<p className="text-gray-500 text-xs">
							+{formatDuration(leg.duration)} · {formatDistance(leg.distance)}
						</p>
					)
				)}
			</div>
			{!readonly && !isOrigin && (
				<button
					type="button"
					onClick={onMakeOrigin}
					aria-label={`Empezar la ruta desde ${stop.label}`}
					title="Usar esta parada como punto de partida"
					className="shrink-0 whitespace-nowrap rounded-full border border-gray-200 px-2.5 py-1 text-gray-600 text-xs hover:border-emerald-600 hover:text-emerald-700"
				>
					Empezar acá
				</button>
			)}
			{!readonly && (
				<button
					type="button"
					onClick={onRemove}
					aria-label={`Eliminar ${stop.label}`}
					title="Eliminar"
					className="shrink-0 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600"
				>
					<svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
						<path d="M9 3a1 1 0 0 0-1 1v1H4.5a1 1 0 1 0 0 2h15a1 1 0 1 0 0-2H16V4a1 1 0 0 0-1-1H9zM6.5 9l.9 11.1A2 2 0 0 0 9.39 22h5.22a2 2 0 0 0 1.99-1.9L17.5 9h-11z" />
					</svg>
				</button>
			)}
		</li>
	);
}
