import { parseSpreadsheet } from "@/lib/excel";

export interface ExtractedStop {
	address: string;
	locality: string;
}

// Lo que viaja al endpoint de extracción: texto CSV (planillas) o el PDF
// entero en base64 (Claude lee PDFs nativamente, incluso escaneados).
export type ExtractPayload = { text: string } | { pdf: string };

const MAX_FILE_BYTES = 2 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
		reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
		reader.readAsDataURL(file);
	});
}

export async function readImportFile(file: File): Promise<ExtractPayload> {
	if (file.size > MAX_FILE_BYTES) {
		throw new Error("El archivo es muy grande (máximo 2 MB)");
	}
	const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
	if (isPdf) return { pdf: await fileToBase64(file) };
	return { text: await parseSpreadsheet(file) };
}

// Pide a la función serverless que la IA extraiga pares dirección/localidad
// del archivo. La geolocalización NO pasa por acá: la hace el pipeline
// existente (Georef + Photon) en el cliente.
export async function requestExtraction(payload: ExtractPayload): Promise<ExtractedStop[]> {
	let res: Response;
	try {
		res = await fetch("/api/extract-stops", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});
	} catch {
		throw new Error("No hay conexión. Probá de nuevo.");
	}
	const data = (await res.json().catch(() => null)) as {
		stops?: ExtractedStop[];
		error?: string;
	} | null;
	if (!res.ok || !data?.stops) {
		throw new Error(data?.error ?? "No se pudieron detectar las direcciones. Probá de nuevo.");
	}
	return data.stops.filter(
		(s) => typeof s.address === "string" && typeof s.locality === "string" && s.address.trim(),
	);
}
