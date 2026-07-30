import type { Page } from "@playwright/test";
// default import: lz-string es UMD y el loader de Playwright no ve sus named exports
import lz from "lz-string";

export interface FixturePlace {
	// lo que se tipea en el buscador
	query: string;
	name: string;
	city: string;
	// label que muestra la app: `${name}, ${city}`
	label: string;
	lat: number;
	lng: number;
}

export const PLACES = {
	obelisco: {
		query: "obelisco",
		name: "Obelisco",
		city: "Buenos Aires",
		label: "Obelisco, Buenos Aires",
		lat: -34.6037,
		lng: -58.3816,
	},
	caminito: {
		query: "caminito",
		name: "Caminito",
		city: "La Boca",
		label: "Caminito, La Boca",
		lat: -34.6393,
		lng: -58.3657,
	},
	congreso: {
		query: "congreso",
		name: "Congreso",
		city: "Balvanera",
		label: "Congreso, Balvanera",
		lat: -34.6098,
		lng: -58.3925,
	},
} satisfies Record<string, FixturePlace>;

// cada tramo mockeado de OSRM dura 10 min y mide 3 km: con 2 paradas el
// resumen muestra "10 min · 3 km", con roundtrip "20 min · 6 km", etc.
export const LEG_DURATION_S = 600;
export const LEG_DISTANCE_M = 3000;

const TILE_PNG = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
	"base64",
);

// Deja la página sin dependencias de red: tiles, geocoders y OSRM responden
// fixtures deterministas. Llamar SIEMPRE antes de goto().
export async function mockExternalApis(page: Page): Promise<void> {
	await page.route("https://tile.openstreetmap.org/**", (route) =>
		route.fulfill({ contentType: "image/png", body: TILE_PNG }),
	);

	await page.route("https://photon.komoot.io/**", (route) => {
		const q = new URL(route.request().url()).searchParams.get("q")?.toLowerCase() ?? "";
		const match = Object.values(PLACES).find((p) => q.includes(p.query));
		const features = match
			? [
					{
						geometry: { coordinates: [match.lng, match.lat] },
						properties: { countrycode: "AR", name: match.name, city: match.city },
					},
				]
			: [];
		return route.fulfill({ json: { features } });
	});

	await page.route("https://apis.datos.gob.ar/**", (route) =>
		route.fulfill({ json: { direcciones: [] } }),
	);

	await page.route("https://nominatim.openstreetmap.org/**", (route) =>
		route.fulfill({ json: {} }),
	);

	// arma el viaje a partir de las coordenadas pedidas, en el mismo orden
	await page.route("https://router.project-osrm.org/**", (route) => {
		const url = new URL(route.request().url());
		const coords = (url.pathname.split("/").pop() ?? "")
			.split(";")
			.map((pair) => pair.split(",").map(Number) as [number, number]);
		const roundtrip = url.searchParams.get("roundtrip") === "true";
		const legCount = roundtrip ? coords.length : coords.length - 1;
		return route.fulfill({
			json: {
				code: "Ok",
				waypoints: coords.map((_, i) => ({ waypoint_index: i })),
				trips: [
					{
						duration: legCount * LEG_DURATION_S,
						distance: legCount * LEG_DISTANCE_M,
						geometry: { coordinates: roundtrip ? [...coords, coords[0]] : coords },
						legs: Array.from({ length: legCount }, () => ({
							duration: LEG_DURATION_S,
							distance: LEG_DISTANCE_M,
						})),
					},
				],
			},
		});
	});
}

// Marca como vistos el tour de bienvenida y el aviso de instalación para que
// sus overlays no tapen la UI (en la emulación Android el hint sí aparece).
export async function seedSeenHints(page: Page): Promise<void> {
	await page.addInitScript(() => {
		localStorage.setItem("rutaya-welcome-seen", "1");
		localStorage.setItem("rutaya-install-hint-seen", "1");
	});
}

// Genera el valor de ?r= replicando el RoutePayload v1 de src/lib/share.ts.
// Si el formato cambia, PLANNER-E2E-005 falla porque la app no puede decodificarlo.
export function buildShareParam(places: FixturePlace[], roundtrip = false): string {
	const payload = { v: 1, rt: roundtrip, s: places.map((p) => [p.lat, p.lng, p.label]) };
	return lz.compressToEncodedURIComponent(JSON.stringify(payload));
}
