export interface GeocodeResult {
	label: string;
	lat: number;
	lng: number;
}

// minLon,minLat,maxLon,maxLat — Argentina continental
const ARGENTINA_BBOX = "-73.6,-55.2,-53.5,-21.7";

interface PhotonFeature {
	geometry: { coordinates: [number, number] };
	properties: {
		countrycode?: string;
		name?: string;
		street?: string;
		housenumber?: string;
		city?: string;
		state?: string;
	};
}

async function searchPhoton(
	query: string,
	center: { lat: number; lng: number },
): Promise<GeocodeResult[]> {
	const url = new URL("https://photon.komoot.io/api/");
	url.searchParams.set("q", query);
	url.searchParams.set("limit", "5");
	url.searchParams.set("lang", "default");
	url.searchParams.set("lat", String(center.lat));
	url.searchParams.set("lon", String(center.lng));
	url.searchParams.set("bbox", ARGENTINA_BBOX);
	const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
	if (!res.ok) throw new Error("No se pudo buscar");
	const data: { features?: PhotonFeature[] } = await res.json();
	return (data.features ?? [])
		.filter((f) => f.properties.countrycode === "AR")
		.map((f) => {
			const p = f.properties;
			const street = p.street && p.housenumber ? `${p.street} ${p.housenumber}` : p.street;
			const main = p.name ?? street ?? "Sin nombre";
			const area = p.city ?? p.state;
			return {
				label: area ? `${main}, ${area}` : main,
				lat: f.geometry.coordinates[1],
				lng: f.geometry.coordinates[0],
			};
		});
}

// Georef: API oficial argentina (datos.gob.ar). Resuelve calle + altura contra la
// cartografía de INDEC/IGN, que cubre números de puerta que faltan en OSM.
interface GeorefDireccion {
	calle: { nombre: string };
	altura: { valor: number | null };
	localidad_censal: { nombre: string | null };
	provincia: { nombre: string | null };
	ubicacion: { lat: number | null; lon: number | null } | null;
}

const LOWERCASE_WORDS = new Set(["de", "del", "la", "las", "los", "y", "e", "al"]);

function titleCase(text: string): string {
	return text
		.toLowerCase()
		.split(" ")
		.filter(Boolean)
		.map((w, i) => (i > 0 && LOWERCASE_WORDS.has(w) ? w : w[0].toUpperCase() + w.slice(1)))
		.join(" ");
}

async function searchGeoref(
	query: string,
	center: { lat: number; lng: number },
	locality?: string,
): Promise<GeocodeResult[]> {
	const url = new URL("https://apis.datos.gob.ar/georef/api/direcciones");
	url.searchParams.set("direccion", query);
	if (locality) url.searchParams.set("localidad", locality);
	url.searchParams.set("max", "10");
	const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
	if (!res.ok) throw new Error("No se pudo buscar");
	const data: { direcciones?: GeorefDireccion[] } = await res.json();
	const located = (data.direcciones ?? []).flatMap((d) => {
		const lat = d.ubicacion?.lat;
		const lng = d.ubicacion?.lon;
		if (lat == null || lng == null) return [];
		return [{ d, lat, lng }];
	});
	// Georef no tiene sesgo por cercanía: devuelve matches de todo el país,
	// así que ordenamos por distancia al centro del mapa
	const dist2 = (r: { lat: number; lng: number }) =>
		(r.lat - center.lat) ** 2 + (r.lng - center.lng) ** 2;
	located.sort((a, b) => dist2(a) - dist2(b));
	return located.slice(0, 4).map(({ d, lat, lng }) => {
		const street = titleCase(d.calle.nombre);
		const altura = d.altura?.valor != null ? ` ${d.altura.valor}` : "";
		const area = d.localidad_censal?.nombre ?? d.provincia?.nombre;
		return {
			label: area ? `${street}${altura}, ${area}` : `${street}${altura}`,
			lat,
			lng,
		};
	});
}

// dos resultados a <~100 m son la misma dirección vista por dos fuentes distintas
function dedupeByProximity(results: GeocodeResult[]): GeocodeResult[] {
	const kept: GeocodeResult[] = [];
	for (const r of results) {
		const isDup = kept.some(
			(k) => Math.abs(k.lat - r.lat) < 1e-3 && Math.abs(k.lng - r.lng) < 1e-3,
		);
		if (!isDup) kept.push(r);
	}
	return kept;
}

export async function searchAddresses(
	query: string,
	center: { lat: number; lng: number },
): Promise<GeocodeResult[]> {
	// Georef solo sirve para "calle + altura"; sin número (POIs, calles) alcanza Photon
	const hasNumber = /\d/.test(query);
	const [photon, georef] = await Promise.allSettled([
		searchPhoton(query, center),
		hasNumber ? searchGeoref(query, center) : Promise.resolve<GeocodeResult[]>([]),
	]);
	const photonOk = photon.status === "fulfilled";
	const georefOk = georef.status === "fulfilled";
	// error solo si fallaron todas las fuentes consultadas
	if (!photonOk && (!hasNumber || !georefOk)) throw new Error("No se pudo buscar");
	// Georef primero: si el usuario tipeó una altura, es el match oficial preciso
	const merged = [...(georefOk ? georef.value : []), ...(photonOk ? photon.value : [])];
	return dedupeByProximity(merged).slice(0, 6);
}

// Geocodifica una dirección importada de una planilla. A diferencia del
// typeahead, acá tenemos la localidad por separado: Georef la usa como filtro
// estructurado (mucho más preciso que ordenar por cercanía al mapa).
export async function geocodeImported(
	address: string,
	locality: string,
	center: { lat: number; lng: number },
): Promise<GeocodeResult | null> {
	const query = locality ? `${address}, ${locality}` : address;
	const hasNumber = /\d/.test(address);
	const [photon, georef] = await Promise.allSettled([
		searchPhoton(query, center),
		hasNumber ? searchGeoref(address, center, locality || undefined) : Promise.resolve([]),
	]);
	const georefResults = georef.status === "fulfilled" ? georef.value : [];
	const photonResults = photon.status === "fulfilled" ? photon.value : [];
	const best = georefResults[0] ?? photonResults[0];
	if (best) return best;
	// último intento: Georef sin filtro de localidad (la IA pudo extraerla mal)
	if (hasNumber && locality) {
		try {
			return (await searchGeoref(address, center))[0] ?? null;
		} catch {
			return null;
		}
	}
	return null;
}

interface NominatimReverse {
	display_name?: string;
	address?: {
		road?: string;
		house_number?: string;
		suburb?: string;
		neighbourhood?: string;
		city?: string;
		town?: string;
		village?: string;
	};
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
	try {
		const url = new URL("https://nominatim.openstreetmap.org/reverse");
		url.searchParams.set("format", "jsonv2");
		url.searchParams.set("lat", String(lat));
		url.searchParams.set("lon", String(lng));
		url.searchParams.set("accept-language", "es");
		url.searchParams.set("zoom", "18");
		const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
		if (!res.ok) return null;
		const data: NominatimReverse = await res.json();
		const a = data.address;
		if (a?.road) {
			const street = a.house_number ? `${a.road} ${a.house_number}` : a.road;
			const area = a.suburb ?? a.neighbourhood ?? a.city ?? a.town ?? a.village;
			return area ? `${street}, ${area}` : street;
		}
		if (!data.display_name) return null;
		return data.display_name.split(",").slice(0, 2).join(",").trim();
	} catch {
		return null;
	}
}
