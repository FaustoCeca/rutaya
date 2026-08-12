import { useState } from "react";
import type { ImportRow } from "@/hooks/useFileImport";
import { geocodeImported } from "@/lib/geocoding";

interface ImportRowEditorProps {
	row: ImportRow;
	// punto de sesgo de cercanía resuelto durante el import
	center: { lat: number; lng: number };
	onSave: (row: ImportRow) => void;
	onCancel: () => void;
}

// Editor inline de una fila importada: permite corregir la calle y la ciudad
// y volver a ubicarla en el mapa antes de agregarla al viaje.
export function ImportRowEditor({ row, center, onSave, onCancel }: ImportRowEditorProps) {
	const [address, setAddress] = useState(row.address);
	const [locality, setLocality] = useState(row.locality);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function search() {
		setBusy(true);
		setError(null);
		try {
			const located = await geocodeImported(address.trim(), locality.trim(), center);
			if (!located) {
				setError("No encontramos esa dirección. Probá ajustando la calle o la ciudad.");
				return;
			}
			onSave({ ...row, address: address.trim(), locality: locality.trim(), located });
		} catch {
			setError("No se pudo buscar. Probá de nuevo.");
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="space-y-2 py-2.5">
			<input
				type="text"
				name="direccion"
				value={address}
				onChange={(e) => setAddress(e.target.value)}
				placeholder="Calle y altura"
				aria-label="Dirección"
				autoComplete="off"
				className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
			/>
			<input
				type="text"
				name="ciudad"
				value={locality}
				onChange={(e) => setLocality(e.target.value)}
				placeholder="Ciudad o localidad"
				aria-label="Ciudad"
				autoComplete="off"
				className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
			/>
			{error && <p className="text-red-600 text-xs">{error}</p>}
			<div className="flex gap-2">
				{/* "Volver" y no "Cancelar": abajo ya hay un Cancelar que cierra todo el import */}
				<button
					type="button"
					onClick={onCancel}
					className="flex-1 rounded-full border border-gray-300 py-2 font-semibold text-gray-700 text-sm"
				>
					Volver
				</button>
				<button
					type="button"
					onClick={() => void search()}
					disabled={busy || address.trim().length === 0}
					className="flex-1 rounded-full bg-emerald-600 py-2 font-semibold text-sm text-white disabled:opacity-40"
				>
					{busy ? "Buscando…" : "Buscar en el mapa"}
				</button>
			</div>
		</div>
	);
}
