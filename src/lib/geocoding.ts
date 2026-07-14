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

export async function searchAddresses(
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
