import { runExtraction } from "./_lib/extract";

// Función serverless de Vercel (firma Web estándar). En dev, el mismo
// runExtraction se sirve desde un middleware de Vite (ver vite.config.ts).
export async function POST(request: Request): Promise<Response> {
	const body = await request.json().catch(() => null);
	const result = await runExtraction(body);
	return Response.json(result.body, { status: result.status });
}
