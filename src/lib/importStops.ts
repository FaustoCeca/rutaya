export interface ExtractedStop {
	address: string;
	locality: string;
}

// Pide a la función serverless que la IA extraiga pares dirección/localidad
// del texto crudo de la planilla. La geolocalización NO pasa por acá:
// la hace el pipeline existente (Georef + Photon) en el cliente.
export async function requestExtraction(text: string): Promise<ExtractedStop[]> {
	let res: Response;
	try {
		res = await fetch("/api/extract-stops", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ text }),
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
