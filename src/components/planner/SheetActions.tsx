import type { Stop } from "@/hooks/useStops";
import type { PlannerMode } from "@/hooks/useTripLifecycle";
import { type MapsLeg, stopNavUrl } from "@/lib/googleMaps";

interface SheetActionsProps {
	mode: PlannerMode;
	isPreview: boolean;
	canCreate: boolean;
	mapsLegs: MapsLeg[];
	// próxima parada sin entregar en orden de visita; undefined sin orden o al completar
	nextStop: Stop | undefined;
	allDelivered: boolean;
	// origen del viaje, solo en roundtrip: al completar se ofrece volver
	originStop: Stop | undefined;
	// se está modificando un viaje en curso: el CTA de edición guarda en vez de crear
	isModifying: boolean;
	onModify: () => void;
	onShare: () => void;
	onCreate: () => void;
	onSave: () => void;
	onEnd: () => void;
	onImportFile: (file: File) => void;
}

export function SheetActions({
	mode,
	isPreview,
	canCreate,
	mapsLegs,
	nextStop,
	allDelivered,
	originStop,
	isModifying,
	onModify,
	onShare,
	onCreate,
	onSave,
	onEnd,
	onImportFile,
}: SheetActionsProps) {
	if (mode === "edit") {
		return (
			<div className="space-y-2 px-4 pb-3">
				<label className="block w-full cursor-pointer rounded-full border-2 border-emerald-600 py-2 text-center font-semibold text-emerald-700 text-sm">
					Importar Excel o PDF
					<input
						type="file"
						accept=".xlsx,.xls,.csv,.pdf,application/pdf"
						className="hidden"
						onChange={(e) => {
							const file = e.target.files?.[0];
							if (file) onImportFile(file);
							e.target.value = "";
						}}
					/>
				</label>
				<button
					type="button"
					onClick={onCreate}
					disabled={!canCreate}
					className="w-full rounded-full bg-emerald-600 py-2.5 font-semibold text-sm text-white disabled:opacity-40"
				>
					{isModifying ? "Guardar cambios" : "Crear viaje"}
				</button>
			</div>
		);
	}
	return (
		<div className="space-y-2 px-4 pb-3">
			{!isPreview && allDelivered && (
				<p className="rounded-2xl bg-emerald-50 px-4 py-3 text-center font-medium text-emerald-700 text-sm">
					¡Todas las paradas entregadas! Podés terminar el viaje.
				</p>
			)}
			{!isPreview && allDelivered && originStop && (
				<a
					href={stopNavUrl(originStop)}
					target="_blank"
					rel="noopener noreferrer"
					className="block w-full rounded-full bg-emerald-600 py-2.5 text-center font-semibold text-sm text-white"
				>
					Volver al origen
					<span className="block truncate px-4 font-normal text-emerald-100 text-xs">
						{originStop.label}
					</span>
				</a>
			)}
			{!isPreview && !allDelivered && nextStop && (
				<a
					href={stopNavUrl(nextStop)}
					target="_blank"
					rel="noopener noreferrer"
					className="block w-full rounded-full bg-emerald-600 py-2.5 text-center font-semibold text-sm text-white"
				>
					Ir a la próxima parada
					<span className="block truncate px-4 font-normal text-emerald-100 text-xs">
						{nextStop.label}
					</span>
				</a>
			)}
			{!isPreview && !allDelivered && !nextStop && (
				<button
					type="button"
					disabled
					className="w-full rounded-full bg-emerald-600 py-2.5 font-semibold text-sm text-white opacity-40"
				>
					Ir a la próxima parada
				</button>
			)}
			<div className="flex gap-2">
				<button
					type="button"
					onClick={onShare}
					className={
						isPreview
							? "flex-1 rounded-full bg-emerald-600 py-2.5 font-semibold text-sm text-white"
							: "flex-1 rounded-full border-2 border-emerald-600 py-2 font-semibold text-emerald-700 text-sm"
					}
				>
					Compartir
				</button>
				{mapsLegs.length === 1 && (
					<a
						href={mapsLegs[0].url}
						target="_blank"
						rel="noopener noreferrer"
						className="flex-1 rounded-full bg-gray-900 py-2.5 text-center font-semibold text-sm text-white"
					>
						Abrir en Google Maps
					</a>
				)}
				{mapsLegs.length === 0 && (
					<button
						type="button"
						disabled
						className="flex-1 rounded-full bg-gray-900 py-2.5 font-semibold text-sm text-white opacity-40"
					>
						Abrir en Google Maps
					</button>
				)}
			</div>
			{mapsLegs.length > 1 && (
				<div className="flex gap-2">
					{mapsLegs.map((leg, i) => (
						<a
							key={leg.url}
							href={leg.url}
							target="_blank"
							rel="noopener noreferrer"
							className="flex-1 rounded-2xl bg-gray-900 py-2 text-center font-semibold text-sm text-white"
						>
							Maps · Tramo {i + 1}
							<span className="block font-normal text-gray-300 text-xs">
								paradas {leg.from} a {leg.to}
							</span>
						</a>
					))}
				</div>
			)}
			{isPreview ? (
				<button
					type="button"
					onClick={onSave}
					className="w-full rounded-full border-2 border-emerald-600 py-2 font-semibold text-emerald-700 text-sm"
				>
					Guardar como mi viaje
				</button>
			) : (
				<div className="flex gap-2">
					<button
						type="button"
						onClick={onModify}
						className="flex-1 rounded-full border-2 border-emerald-600 py-2 font-semibold text-emerald-700 text-sm"
					>
						Modificar viaje
					</button>
					<button
						type="button"
						onClick={onEnd}
						className="flex-1 rounded-full border border-red-200 py-2 font-semibold text-red-600 text-sm"
					>
						Terminar viaje
					</button>
				</div>
			)}
		</div>
	);
}
