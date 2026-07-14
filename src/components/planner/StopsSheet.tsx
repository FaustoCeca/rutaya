import { useState } from "react";
import type { Stop } from "@/hooks/useStops";
import { formatDistance, formatDuration } from "@/lib/format";
import type { TripResult } from "@/lib/osrm";
import { RouteSummary } from "./RouteSummary";
import { StopListItem } from "./StopListItem";

interface StopsSheetProps {
	stops: Stop[];
	roundtrip: boolean;
	trip: TripResult | undefined;
	// orden validado contra el set actual de paradas (undefined si el trip quedó viejo)
	order: number[] | undefined;
	isFetching: boolean;
	isError: boolean;
	onRetry: () => void;
	onToggleRoundtrip: () => void;
	onRemove: (id: string) => void;
	onMakeOrigin: (id: string) => void;
}

export function StopsSheet({
	stops,
	roundtrip,
	trip,
	order,
	isFetching,
	isError,
	onRetry,
	onToggleRoundtrip,
	onRemove,
	onMakeOrigin,
}: StopsSheetProps) {
	const [expanded, setExpanded] = useState(false);

	const orderedStops = stops
		.map((stop, i) => ({ stop, pos: order?.[i] ?? i }))
		.sort((a, b) => a.pos - b.pos);
	const legs = order && trip ? trip.legs : undefined;
	const returnLeg = roundtrip && legs ? legs[legs.length - 1] : undefined;

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
			<RouteSummary
				stopCount={stops.length}
				trip={trip}
				isFetching={isFetching}
				isError={isError}
				onRetry={onRetry}
			/>
			{expanded && stops.length > 0 && (
				<div className="border-gray-100 border-t">
					<ul className="max-h-[45dvh] overflow-y-auto py-1">
						{orderedStops.map(({ stop, pos }) => (
							<StopListItem
								key={stop.id}
								stop={stop}
								visitNumber={pos + 1}
								isOrigin={pos === 0}
								leg={pos > 0 ? legs?.[pos - 1] : undefined}
								onRemove={() => onRemove(stop.id)}
								onMakeOrigin={() => onMakeOrigin(stop.id)}
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
					<label className="flex items-center justify-between border-gray-100 border-t px-4 py-3">
						<span className="font-medium text-gray-900 text-sm">Volver al punto de partida</span>
						<input
							type="checkbox"
							checked={roundtrip}
							onChange={onToggleRoundtrip}
							className="h-5 w-9 appearance-none rounded-full bg-gray-300 transition-colors before:m-0.5 before:block before:h-4 before:w-4 before:rounded-full before:bg-white before:shadow before:transition-transform checked:bg-emerald-600 checked:before:translate-x-4"
						/>
					</label>
				</div>
			)}
		</section>
	);
}
