import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { runExtraction } from "./api/extract-stops";

// replica en dev la función serverless de Vercel (api/extract-stops.ts)
function extractStopsDev(): Plugin {
	return {
		name: "extract-stops-dev",
		configureServer(server) {
			server.middlewares.use("/api/extract-stops", (req, res) => {
				if (req.method !== "POST") {
					res.statusCode = 405;
					res.end();
					return;
				}
				let raw = "";
				req.on("data", (chunk) => {
					raw += chunk;
					// deja pasar PDFs en base64 (~2,8M chars para un archivo de 2 MB)
					if (raw.length > 4_000_000) req.destroy();
				});
				req.on("end", () => {
					void (async () => {
						let body: unknown = null;
						try {
							body = JSON.parse(raw);
						} catch {}
						const result = await runExtraction(body);
						res.statusCode = result.status;
						res.setHeader("Content-Type", "application/json");
						res.end(JSON.stringify(result.body));
					})();
				});
			});
		},
	};
}

export default defineConfig(({ mode }) => {
	// expone ANTHROPIC_API_KEY de .env.local al middleware de dev
	const env = loadEnv(mode, process.cwd(), "");
	if (env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
	return {
		plugins: [react(), tailwindcss(), extractStopsDev()],
		resolve: {
			alias: {
				"@": resolve(__dirname, "./src"),
			},
		},
	};
});
