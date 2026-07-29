import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runExtraction } from "./_lib/extract";

// Función serverless de Vercel con la firma clásica de Node (la Web estándar
// no está garantizada en proyectos Vite). En dev, el mismo runExtraction se
// sirve desde un middleware de Vite (ver vite.config.ts).
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
	if (req.method !== "POST") {
		res.status(405).end();
		return;
	}
	try {
		// Vercel parsea el JSON a req.body; si llegara como string, lo cubrimos
		const body: unknown = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
		const result = await runExtraction(body ?? null);
		res.status(result.status).json(result.body);
	} catch {
		res.status(502).json({ error: "No se pudieron detectar las direcciones. Probá de nuevo." });
	}
}
