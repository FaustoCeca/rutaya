import { useEffect, useState } from "react";
import { parseSpreadsheet } from "@/lib/excel";
import { type GeocodeResult, geocodeImported } from "@/lib/geocoding";
import { requestExtraction } from "@/lib/importStops";

export interface ImportRow {
	id: string;
	address: string;
	locality: string;
	located: GeocodeResult | null;
}

export type ImportState =
	| { phase: "working"; message: string }
	| { phase: "review"; rows: ImportRow[] }
	| { phase: "error"; message: string };

// Pipeline de importación: leer la planilla → extraer pares dirección/localidad
// con IA → geolocalizar cada par con Georef/Photon (secuencial, con progreso).
// `center` es un snapshot del centro del mapa al momento de elegir el archivo.
export function useExcelImport(file: File, center: { lat: number; lng: number }) {
	const [state, setState] = useState<ImportState>({
		phase: "working",
		message: "Leyendo la planilla…",
	});

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			try {
				const text = await parseSpreadsheet(file);
				if (cancelled) return;
				setState({ phase: "working", message: "Detectando direcciones con IA…" });
				const extracted = await requestExtraction(text);
				if (cancelled) return;
				if (extracted.length === 0) {
					setState({ phase: "error", message: "No encontramos direcciones en la planilla" });
					return;
				}
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
				setState({ phase: "review", rows });
			} catch (err) {
				if (cancelled) return;
				const message = err instanceof Error ? err.message : "No se pudo importar la planilla";
				setState({ phase: "error", message });
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [file, center]);

	return state;
}
