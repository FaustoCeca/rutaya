import Anthropic from "@anthropic-ai/sdk";

const MAX_TEXT_CHARS = 30_000;
// 2 MB de archivo → ~2,8M chars en base64 (el límite de body de Vercel es 4,5 MB)
const MAX_PDF_CHARS = 3_000_000;
const MAX_STOPS = 50;

// límite laxo por instancia: amortigua abuso del endpoint público sin
// necesitar infraestructura extra (las instancias serverless no comparten memoria)
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_HITS = 20;
let hits: number[] = [];

function rateLimited(): boolean {
	const now = Date.now();
	hits = hits.filter((t) => now - t < RATE_WINDOW_MS);
	if (hits.length >= RATE_MAX_HITS) return true;
	hits.push(now);
	return false;
}

const SYSTEM = `Sos un asistente que extrae direcciones de entrega de documentos de Argentina.
Recibís el contenido de una planilla de cálculo (texto CSV) o un documento PDF (lista de pedidos, remito, hoja de ruta) sin estructura fija: los datos pueden estar en cualquier orden, con o sin encabezados, y mezclados con otra información (nombres, teléfonos, montos, notas).

Tu tarea: detectar cada dirección de entrega y devolver la lista en el mismo orden en que aparece.

Reglas:
- "address" es calle y altura (ej: "San Martín 1400"). Si la calle y el número están en celdas separadas, unilos.
- "locality" es la ciudad o localidad (ej: "Rosario"). Si una fila no la indica pero la planilla sí (en un título, encabezado u otra columna), usá esa. Si no aparece en ningún lado, dejala vacía ("").
- Expandí abreviaturas obvias (av. → Avenida, gral. → General) pero NO inventes datos que no estén en la planilla.
- Ignorá filas que no sean direcciones (totales, encabezados, notas, nombres sueltos).
- No repitas direcciones duplicadas.`;

const SCHEMA = {
	type: "object",
	properties: {
		stops: {
			type: "array",
			items: {
				type: "object",
				properties: {
					address: { type: "string", description: "Calle y altura, ej: 'San Martín 1400'" },
					locality: { type: "string", description: "Ciudad o localidad; '' si no aparece" },
				},
				required: ["address", "locality"],
				additionalProperties: false,
			},
		},
	},
	required: ["stops"],
	additionalProperties: false,
};

interface ExtractionResult {
	status: number;
	body: Record<string, unknown>;
}

export async function runExtraction(reqBody: unknown): Promise<ExtractionResult> {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		return { status: 503, body: { error: "El servicio de importación no está configurado" } };
	}
	if (rateLimited()) {
		return { status: 429, body: { error: "Demasiadas importaciones seguidas. Esperá un minuto." } };
	}
	const { text, pdf } = (reqBody ?? {}) as { text?: unknown; pdf?: unknown };
	let content: Anthropic.MessageParam["content"];
	if (typeof pdf === "string" && pdf.length > 0 && pdf.length <= MAX_PDF_CHARS) {
		content = [
			{
				type: "document",
				source: { type: "base64", media_type: "application/pdf", data: pdf },
			},
			{ type: "text", text: "Extraé las direcciones de entrega de este documento." },
		];
	} else if (typeof text === "string" && text.trim() && text.length <= MAX_TEXT_CHARS) {
		content = text;
	} else {
		return { status: 400, body: { error: "El archivo no se pudo leer" } };
	}

	const client = new Anthropic({ apiKey });
	try {
		const response = await client.messages.create({
			model: "claude-haiku-4-5",
			max_tokens: 16000,
			system: SYSTEM,
			output_config: { format: { type: "json_schema", schema: SCHEMA } },
			messages: [{ role: "user", content }],
		});
		const block = response.content.find((b) => b.type === "text");
		if (response.stop_reason !== "end_turn" || !block) {
			return { status: 502, body: { error: "No se pudieron detectar las direcciones" } };
		}
		const parsed = JSON.parse(block.text) as {
			stops: { address: string; locality: string }[];
		};
		const stops = parsed.stops
			.map((s) => ({ address: s.address.trim(), locality: s.locality.trim() }))
			.filter((s) => s.address.length > 0)
			.slice(0, MAX_STOPS);
		return { status: 200, body: { stops } };
	} catch {
		return {
			status: 502,
			body: { error: "No se pudieron detectar las direcciones. Probá de nuevo." },
		};
	}
}
