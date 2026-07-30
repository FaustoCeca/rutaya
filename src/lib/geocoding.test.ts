import { geocodeImported, reverseGeocode, searchAddresses } from "./geocoding";

const CENTER = { lat: -34.6, lng: -58.38 };

function photonFeature(
	lat: number,
	lng: number,
	properties: Record<string, string>,
): Record<string, unknown> {
	return { geometry: { coordinates: [lng, lat] }, properties };
}

function georefDireccion(
	nombre: string,
	altura: number | null,
	lat: number,
	lng: number,
	localidad: string | null = "Rosario",
): Record<string, unknown> {
	return {
		calle: { nombre },
		altura: { valor: altura },
		localidad_censal: { nombre: localidad },
		provincia: { nombre: "Santa Fe" },
		ubicacion: { lat, lon: lng },
	};
}

interface ApiMocks {
	photon?: unknown;
	georef?: unknown;
	nominatim?: unknown;
}

// Un solo mock de fetch que enruta por host, como hacen las tres APIs reales.
// Pasar un Error como valor simula la caída de esa fuente.
function mockGeoApis(mocks: ApiMocks) {
	const mock = vi.fn().mockImplementation((input: URL | string) => {
		const url = String(input);
		const body = url.includes("photon.komoot.io")
			? mocks.photon
			: url.includes("apis.datos.gob.ar")
				? mocks.georef
				: url.includes("nominatim.openstreetmap.org")
					? mocks.nominatim
					: undefined;
		if (body === undefined) return Promise.reject(new Error(`fetch inesperado: ${url}`));
		if (body instanceof Error) return Promise.reject(body);
		return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
	});
	vi.stubGlobal("fetch", mock);
	return mock;
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("searchAddresses", () => {
	it("should query only Photon when the text has no street number", async () => {
		const mock = mockGeoApis({
			photon: {
				features: [
					photonFeature(-34.6037, -58.3816, {
						countrycode: "AR",
						name: "Obelisco",
						city: "Buenos Aires",
					}),
					photonFeature(40.4, -3.7, { countrycode: "ES", name: "Madrid" }),
				],
			},
		});

		const results = await searchAddresses("obelisco", CENTER);

		expect(mock).toHaveBeenCalledTimes(1);
		expect(results).toEqual([{ label: "Obelisco, Buenos Aires", lat: -34.6037, lng: -58.3816 }]);
	});

	it("should put Georef matches first and title-case street names", async () => {
		mockGeoApis({
			photon: {
				features: [
					photonFeature(-34.7, -58.5, {
						countrycode: "AR",
						street: "Corrientes",
						housenumber: "100",
						city: "CABA",
					}),
				],
			},
			georef: { direcciones: [georefDireccion("AV. CORRIENTES", 100, -34.61, -58.39)] },
		});

		const results = await searchAddresses("corrientes 100", CENTER);

		expect(results[0]).toEqual({ label: "Av. Corrientes 100, Rosario", lat: -34.61, lng: -58.39 });
		expect(results[1].label).toBe("Corrientes 100, CABA");
	});

	it("should drop near-duplicate results from different sources", async () => {
		mockGeoApis({
			photon: {
				features: [
					photonFeature(-34.6101, -58.3901, {
						countrycode: "AR",
						street: "Corrientes",
						housenumber: "100",
					}),
				],
			},
			georef: { direcciones: [georefDireccion("CORRIENTES", 100, -34.61, -58.39)] },
		});

		const results = await searchAddresses("corrientes 100", CENTER);

		expect(results).toHaveLength(1);
		expect(results[0].label).toBe("Corrientes 100, Rosario");
	});

	it("should sort Georef matches by distance to the map center", async () => {
		mockGeoApis({
			photon: { features: [] },
			georef: {
				direcciones: [
					georefDireccion("LEJOS", 1, -40, -63, "Viedma"),
					georefDireccion("CERCA", 1, -34.61, -58.39, "CABA"),
				],
			},
		});

		const results = await searchAddresses("calle 1", CENTER);

		expect(results.map((r) => r.label)).toEqual(["Cerca 1, CABA", "Lejos 1, Viedma"]);
	});

	it("should fail only when every queried source fails", async () => {
		mockGeoApis({ photon: new Error("caída") });

		await expect(searchAddresses("obelisco", CENTER)).rejects.toThrow("No se pudo buscar");
	});

	it("should still answer from Georef when Photon is down", async () => {
		mockGeoApis({
			photon: new Error("caída"),
			georef: { direcciones: [georefDireccion("SAN MARTIN", 500, -34.61, -58.39)] },
		});

		const results = await searchAddresses("san martin 500", CENTER);

		expect(results).toEqual([{ label: "San Martin 500, Rosario", lat: -34.61, lng: -58.39 }]);
	});
});

describe("geocodeImported", () => {
	it("should prefer the Georef match over Photon", async () => {
		mockGeoApis({
			photon: {
				features: [photonFeature(-34.7, -58.5, { countrycode: "AR", name: "Otro lugar" })],
			},
			georef: { direcciones: [georefDireccion("MITRE", 1200, -34.61, -58.39)] },
		});

		const result = await geocodeImported("Mitre 1200", "Rosario", CENTER);

		expect(result?.label).toBe("Mitre 1200, Rosario");
	});

	it("should fall back to Photon when Georef finds nothing without number", async () => {
		mockGeoApis({
			photon: {
				features: [
					photonFeature(-34.62, -58.41, { countrycode: "AR", name: "Plaza Italia", city: "CABA" }),
				],
			},
		});

		const result = await geocodeImported("Plaza Italia", "CABA", CENTER);

		expect(result).toEqual({ label: "Plaza Italia, CABA", lat: -34.62, lng: -58.41 });
	});

	it("should return null when no source finds the address", async () => {
		mockGeoApis({ photon: { features: [] }, georef: { direcciones: [] } });

		const result = await geocodeImported("Inexistente", "", CENTER);

		expect(result).toBeNull();
	});
});

describe("reverseGeocode", () => {
	it("should build 'street number, area' from the address details", async () => {
		mockGeoApis({
			nominatim: {
				address: { road: "Defensa", house_number: "1200", suburb: "San Telmo" },
			},
		});

		await expect(reverseGeocode(-34.62, -58.37)).resolves.toBe("Defensa 1200, San Telmo");
	});

	it("should fall back to the first two parts of display_name", async () => {
		mockGeoApis({
			nominatim: { display_name: "Puente, La Boca, Buenos Aires, Argentina" },
		});

		await expect(reverseGeocode(-34.63, -58.35)).resolves.toBe("Puente, La Boca");
	});

	it("should return null when the request fails", async () => {
		mockGeoApis({ nominatim: new Error("caída") });

		await expect(reverseGeocode(-34.6, -58.38)).resolves.toBeNull();
	});
});
