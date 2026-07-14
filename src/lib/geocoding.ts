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
