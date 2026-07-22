import type { StoredTrip } from "@/lib/tripStorage";

interface TripHistoryListProps {
	history: StoredTrip[];
	onLoad: (entry: StoredTrip) => void;
}

function formatWhen(t: number): string {
	const d = new Date(t);
	const date = d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
	const time = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
	return `${date} ${time}`;
}

export function TripHistoryList({ history, onLoad }: TripHistoryListProps) {
	if (history.length === 0) return null;
	return (
		<div className="border-gray-100 border-t px-4 py-3">
			<h3 className="font-semibold text-gray-500 text-xs uppercase tracking-wide">
				Viajes anteriores
			</h3>
			<ul className="mt-1 space-y-1">
				{history.map((entry) => (
					<li key={entry.createdAt}>
						<button
							type="button"
							onClick={() => onLoad(entry)}
							className="w-full rounded-lg px-2 py-2 text-left hover:bg-gray-50"
						>
							<span className="block font-medium text-gray-900 text-sm">
								{entry.state.stops.length} paradas · {formatWhen(entry.createdAt)}
							</span>
							<span className="block truncate text-gray-500 text-xs">
								Desde: {entry.state.stops[0]?.label}
							</span>
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}
