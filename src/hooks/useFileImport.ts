import { useEffect, useState } from "react";
import { type GeocodeResult, geocodeImported } from "@/lib/geocoding";
import { readImportFile, requestExtraction } from "@/lib/importStops";

export interface ImportRow {
	id: string;
	address: string;
	locality: string;
	located: GeocodeResult | null;
}

export type ImportState =
	| { phase: "working"; message: string }
	// center: el punto de sesgo ya resuelto, para re-geocodificar filas editadas
	| { phase: "review"; rows: ImportRow[]; center: { lat: number; lng: number } }
	| { phase: "error"; message: string };

// Pipeline de importación: leer el archivo (Excel/CSV/PDF) → extraer pares
// dirección/localidad con IA → geolocalizar con Georef/Photon (con progreso).
// `getBias` resuelve el punto de sesgo de cercanía (GPS del usuario, con el
// centro del mapa como fallback) y nunca rechaza.
export function useFileImport(file: File, getBias: () => Promise<{ lat: number; lng: number }>) {
	const [state, setState] = useState<ImportState>({
		phase: "working",
		message: "Leyendo el archivo…",
	});

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			try {
				// en paralelo con la lectura + extracción: el spinner absorbe la latencia
				const biasPromise = getBias();
				const payload = await readImportFile(file);
				if (cancelled) return;
				setState({ phase: "working", message: "Detectando direcciones con IA…" });
				const extracted = await requestExtraction(payload);
				if (cancelled) return;
				if (extracted.length === 0) {
					setState({ phase: "error", message: "No encontramos direcciones en el archivo" });
					return;
				}
				const center = await biasPromise;
				if (cancelled) return;
				const rows: ImportRow[] = [];
				for (let i = 0; i < extracted.length; i++) {
					setState({
						phase: "working",
						message: `Ubicando direcciones… (${i + 1}/${extracted.length})`,
					});
					const { address, locality } = extracted[i];
					let located: GeocodeResult | null = null;
					try {
						located = await geocodeImported(address, locality, center);
					} catch {
						// la fila queda como "no ubicada"; el usuario la ve en la revisión
					}
					if (cancelled) return;
					rows.push({ id: crypto.randomUUID(), address, locality, located });
				}
				setState({ phase: "review", rows, center });
			} catch (err) {
				if (cancelled) return;
				const message = err instanceof Error ? err.message : "No se pudo importar la planilla";
				setState({ phase: "error", message });
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [file, getBias]);

	return state;
}
