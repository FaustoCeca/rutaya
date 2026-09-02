import { useEffect, useState } from "react";
import type { Stop } from "@/hooks/useStops";
import type { PlannerMode } from "@/hooks/useTripLifecycle";
import { formatDistance, formatDuration } from "@/lib/format";
import type { MapsLeg } from "@/lib/googleMaps";
import type { TripResult } from "@/lib/osrm";
import type { StoredStart, StoredTrip } from "@/lib/tripStorage";
import { RouteSummary } from "./RouteSummary";
import { SheetActions } from "./SheetActions";
import { StartPointPicker } from "./StartPointPicker";
import { StopListItem } from "./StopListItem";
import { TripHistoryList } from "./TripHistoryList";

interface StopsSheetProps {
	mode: PlannerMode;
	isPreview: boolean;
	stops: Stop[];
	roundtrip: boolean;
	// hay un punto de partida elegido explícitamente (queda en stops[0])
	hasOrigin: boolean;
	trip: TripResult | undefined;
	// orden validado contra el set actual de paradas (undefined si el trip quedó viejo)
	order: number[] | undefined;
	isFetching: boolean;
	isError: boolean;
	mapsLegs: MapsLeg[];
	history: StoredTrip[];
	startHistory: StoredStart[];
	// índices de paradas entregadas dentro de stops (nunca el origen)
	delivered: number[];
	onToggleDelivered: (index: number) => void;
	onShare: () => void;
	onRetry: () => void;
	onToggleRoundtrip: () => void;
	onRemove: (id: string) => void;
	onMakeOrigin: (id: string) => void;
	onCreateTrip: () => void;
	onSaveTrip: () => void;
	onEndTrip: () => void;
	onLoadHistory: (entry: StoredTrip) => void;
	onImportFile: (file: File) => void;
	onUseMyLocation: () => void;
	onPickStart: (start: StoredStart) => void;
}

export function StopsSheet(props: StopsSheetProps) {
	const { mode, isPreview, stops, roundtrip, hasOrigin, trip, order, history, delivered } = props;
	const [expanded, setExpanded] = useState(false);
	const locked = mode === "trip";

	// en modo viaje la lista es el tablero del reparto: arranca visible
	useEffect(() => {
		if (locked) setExpanded(true);
	}, [locked]);

	const orderedStops = stops
		.map((stop, i) => ({ stop, index: i, pos: order?.[i] ?? i }))
		.sort((a, b) => a.pos - b.pos);
	const legs = order && trip ? trip.legs : undefined;
	const returnLeg = roundtrip && legs ? legs[legs.length - 1] : undefined;
	const hasExpandedContent = stops.length > 0 || (!locked && history.length > 0);

	const marking = locked && !isPreview;
	// el origen no se entrega
	const deliverableCount = stops.length - 1;
	// próxima sin entregar en orden de visita; sin order (OSRM pendiente/falló)
	// no hay próxima: el fallback pos=índice es orden de carga, no de visita
	const nextStop =
		marking && order
			? orderedStops.find((x) => x.index !== 0 && !delivered.includes(x.index))?.stop
			: undefined;
	const allDelivered = marking && deliverableCount > 0 && delivered.length >= deliverableCount;

	return (
		<section className="absolute inset-x-0 bottom-0 z-[1100] rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
			{hasExpandedContent ? (
				<button
					type="button"
					onClick={() => setExpanded((e) => !e)}
					aria-expanded={expanded}
					aria-label={expanded ? "Colapsar panel" : "Expandir panel"}
					className="flex w-full items-center justify-center gap-1 pt-2.5 pb-1.5 text-gray-500"
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2.5"
						strokeLinecap="round"
						strokeLinejoin="round"
						className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
						aria-hidden="true"
					>
						<path d="m6 15 6-6 6 6" />
					</svg>
					<span className="font-medium text-xs">
						{expanded ? "Ocultar" : stops.length > 0 ? "Ver paradas" : "Ver viajes anteriores"}
					</span>
				</button>
			) : (
				<div className="pt-3" />
			)}
			{locked && (
				<p className="px-4 pb-1">
					<span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-medium text-emerald-700 text-xs">
						🔒 {isPreview ? "Viaje recibido" : "Viaje en curso"}
					</span>
					{marking && (
						<span className="ml-2 font-medium text-gray-600 text-xs">
							Entregadas {delivered.length} de {deliverableCount}
						</span>
					)}
				</p>
			)}
			<RouteSummary
				stopCount={stops.length}
				trip={trip}
				isFetching={props.isFetching}
				isError={props.isError}
				onRetry={props.onRetry}
			/>
			{mode === "edit" && (
				<StartPointPicker
					originLabel={hasOrigin ? (stops[0]?.label ?? null) : null}
					startHistory={props.startHistory}
					onUseMyLocation={props.onUseMyLocation}
					onPickStart={props.onPickStart}
				/>
			)}
			<SheetActions
				mode={mode}
				isPreview={isPreview}
				canCreate={!!order && hasOrigin}
				mapsLegs={props.mapsLegs}
				nextStop={nextStop}
				allDelivered={allDelivered}
				originStop={roundtrip ? stops[0] : undefined}
				onShare={props.onShare}
				onCreate={props.onCreateTrip}
				onSave={props.onSaveTrip}
				onEnd={props.onEndTrip}
				onImportFile={props.onImportFile}
			/>
			{expanded && hasExpandedContent && (
				<div className="border-gray-100 border-t">
					{stops.length > 0 && (
						<ul className="max-h-[45dvh] overflow-y-auto py-1">
							{orderedStops.map(({ stop, index, pos }) => (
								<StopListItem
									key={stop.id}
									stop={stop}
									visitNumber={pos + 1}
									isOrigin={pos === 0 && hasOrigin}
									leg={pos > 0 ? legs?.[pos - 1] : undefined}
									readonly={locked}
									deliverable={marking && index !== 0}
									delivered={delivered.includes(index)}
									onToggleDelivered={() => props.onToggleDelivered(index)}
									onRemove={() => props.onRemove(stop.id)}
									onMakeOrigin={() => props.onMakeOrigin(stop.id)}
								/>
							))}
							{returnLeg && (
								<li className="flex items-center gap-3 px-4 py-2.5 text-gray-500">
									<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-emerald-600 border-dashed" />
									<p className="text-sm">
										Vuelta al origen · +{formatDuration(returnLeg.duration)} ·{" "}
										{formatDistance(returnLeg.distance)}
									</p>
								</li>
							)}
						</ul>
					)}
					{!locked && stops.length > 0 && (
						<label className="flex items-center justify-between border-gray-100 border-t px-4 py-3">
							<span className="font-medium text-gray-900 text-sm">Volver al punto de partida</span>
							<input
								type="checkbox"
								name="volver-al-origen"
								checked={roundtrip}
								onChange={props.onToggleRoundtrip}
								className="h-5 w-9 appearance-none rounded-full bg-gray-300 transition-colors before:m-0.5 before:block before:h-4 before:w-4 before:rounded-full before:bg-white before:shadow before:transition-transform checked:bg-emerald-600 checked:before:translate-x-4"
							/>
						</label>
					)}
					{!locked && <TripHistoryList history={history} onLoad={props.onLoadHistory} />}
				</div>
			)}
		</section>
	);
}
