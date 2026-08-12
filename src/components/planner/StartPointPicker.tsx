import type { StoredStart } from "@/lib/tripStorage";

interface StartPointPickerProps {
	// label del punto de partida elegido, o null si todavía no hay uno
	originLabel: string | null;
	startHistory: StoredStart[];
	onUseMyLocation: () => void;
	onPickStart: (start: StoredStart) => void;
}

const PIN_PATH =
	"M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z";
const CLOCK_PATH =
	"M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 5v4.6l3.2 1.9a1 1 0 0 1-1 1.7l-3.7-2.2a1 1 0 0 1-.5-.9V7a1 1 0 0 1 2 0z";

export function StartPointPicker({
	originLabel,
	startHistory,
	onUseMyLocation,
	onPickStart,
}: StartPointPickerProps) {
	if (originLabel !== null) {
		return (
			<p className="flex items-center gap-1.5 px-4 pb-2 text-gray-600 text-sm">
				<svg
					viewBox="0 0 24 24"
					fill="currentColor"
					className="h-4 w-4 shrink-0 text-emerald-600"
					aria-hidden="true"
				>
					<path d={PIN_PATH} />
				</svg>
				<span className="truncate">
					Salís desde <span className="font-medium text-gray-900">{originLabel}</span>
				</span>
			</p>
		);
	}
	return (
		<div className="mx-4 mb-2 rounded-xl bg-amber-50 p-3">
			<p className="font-semibold text-amber-900 text-sm">¿Desde dónde salís?</p>
			<p className="mt-0.5 text-amber-800 text-xs">Todo viaje necesita un punto de partida.</p>
			<div className="mt-2 space-y-1.5">
				<button
					type="button"
					onClick={onUseMyLocation}
					className="flex w-full items-center gap-2 rounded-full border-2 border-emerald-600 bg-white px-3 py-1.5 text-left font-semibold text-emerald-700 text-sm"
				>
					<svg
						viewBox="0 0 24 24"
						fill="currentColor"
						className="h-4 w-4 shrink-0"
						aria-hidden="true"
					>
						<path d={PIN_PATH} />
					</svg>
					Usar mi ubicación actual
				</button>
				{startHistory.map((start) => (
					<button
						key={`${start.lat},${start.lng}`}
						type="button"
						onClick={() => onPickStart(start)}
						className="flex w-full items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-left text-gray-700 text-sm"
					>
						<svg
							viewBox="0 0 24 24"
							fill="currentColor"
							className="h-4 w-4 shrink-0 text-gray-400"
							aria-hidden="true"
						>
							<path d={CLOCK_PATH} />
						</svg>
						<span className="truncate">{start.label}</span>
					</button>
				))}
			</div>
		</div>
	);
}
