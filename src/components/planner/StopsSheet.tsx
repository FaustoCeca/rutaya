import { useState } from "react";
import type { Stop } from "@/hooks/useStops";
import type { PlannerMode } from "@/hooks/useTripLifecycle";
import { formatDistance, formatDuration } from "@/lib/format";
import type { TripResult } from "@/lib/osrm";
import type { StoredTrip } from "@/lib/tripStorage";
import { RouteSummary } from "./RouteSummary";
import { SheetActions } from "./SheetActions";
import { StopListItem } from "./StopListItem";
import { TripHistoryList } from "./TripHistoryList";

interface StopsSheetProps {
	mode: PlannerMode;
	isPreview: boolean;
	stops: Stop[];
	roundtrip: boolean;
	trip: TripResult | undefined;
	// orden validado contra el set actual de paradas (undefined si el trip quedó viejo)
	order: number[] | undefined;
	isFetching: boolean;
	isError: boolean;
	googleMapsUrl: string | undefined;
	history: StoredTrip[];
	onShare: () => void;
	onRetry: () => void;
	onToggleRoundtrip: () => void;
	onRemove: (id: string) => void;
	onMakeOrigin: (id: string) => void;
	onCreateTrip: () => void;
	onSaveTrip: () => void;
	onEndTrip: () => void;
	onLoadHistory: (entry: StoredTrip) => void;
}

export function StopsSheet(props: StopsSheetProps) {
	const { mode, isPreview, stops, roundtrip, trip, order, history } = props;
	const [expanded, setExpanded] = useState(false);
	const locked = mode === "trip";

	const orderedStops = stops
		.map((stop, i) => ({ stop, pos: order?.[i] ?? i }))
		.sort((a, b) => a.pos - b.pos);
	const legs = order && trip ? trip.legs : undefined;
	const returnLeg = roundtrip && legs ? legs[legs.length - 1] : undefined;
	const hasExpandedContent = stops.length > 0 || (!locked && history.length > 0);

	return (
		<section className="absolute inset-x-0 bottom-0 z-[1100] rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
			<button
				type="button"
				onClick={() => setExpanded((e) => !e)}
				aria-expanded={expanded}
				aria-label={expanded ? "Colapsar panel" : "Expandir panel"}
				className="flex w-full justify-center pt-2 pb-2"
			>
				<span className="h-1 w-10 rounded-full bg-gray-300" />
			</button>
			{locked && (
				<p className="px-4 pb-1">
					<span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-medium text-emerald-700 text-xs">
						🔒 {isPreview ? "Viaje recibido" : "Viaje en curso"}
					</span>
				</p>
			)}
			<RouteSummary
				stopCount={stops.length}
				trip={trip}
				isFetching={props.isFetching}
				isError={props.isError}
				onRetry={props.onRetry}
			/>
			<SheetActions
				mode={mode}
				isPreview={isPreview}
				canCreate={!!order}
				googleMapsUrl={props.googleMapsUrl}
				onShare={props.onShare}
				onCreate={props.onCreateTrip}
				onSave={props.onSaveTrip}
				onEnd={props.onEndTrip}
			/>
			{expanded && hasExpandedContent && (
				<div className="border-gray-100 border-t">
					{stops.length > 0 && (
						<ul className="max-h-[45dvh] overflow-y-auto py-1">
							{orderedStops.map(({ stop, pos }) => (
								<StopListItem
									key={stop.id}
									stop={stop}
									visitNumber={pos + 1}
									isOrigin={pos === 0}
									leg={pos > 0 ? legs?.[pos - 1] : undefined}
									readonly={locked}
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
