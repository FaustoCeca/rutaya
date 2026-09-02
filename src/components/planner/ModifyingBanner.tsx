// Franja que marca la sesión de modificación de un viaje en curso, con la
// salida explícita para volver al viaje tal como estaba.
export function ModifyingBanner({ onDiscard }: { onDiscard: () => void }) {
	return (
		<div className="mx-4 mb-1 flex items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2">
			<p className="font-medium text-amber-800 text-xs">Estás modificando tu viaje en curso</p>
			<button
				type="button"
				onClick={onDiscard}
				className="shrink-0 rounded-full border border-amber-300 px-2.5 py-1 font-semibold text-amber-800 text-xs"
			>
				Descartar cambios
			</button>
		</div>
	);
}
