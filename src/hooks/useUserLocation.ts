import { useRef, useState } from "react";
import { getCurrentPosition } from "@/lib/geolocation";

// Para sesgo de cercanía alcanza precisión de ciudad: low accuracy responde
// más rápido y gasta menos batería que el fix de alta precisión.
const BIAS_OPTIONS: PositionOptions = {
	enableHighAccuracy: false,
	timeout: 5000,
	maximumAge: 60_000,
};

// Ubicación del dispositivo usada como punto de sesgo del geocoding
// (sugerencias del buscador e import de planillas). El centro del mapa
// queda solo como fallback cuando no hay GPS.
export function useUserLocation() {
	const locationRef = useRef<{ lat: number; lng: number } | null>(null);
	const requestedRef = useRef(false);
	const [startupFix, setStartupFix] = useState<{ lat: number; lng: number } | null>(null);

	// Idempotente: puede invocarse en cada render sin re-disparar el prompt.
	function requestStartupLocation(): void {
		if (requestedRef.current) return;
		requestedRef.current = true;
		getCurrentPosition(BIAS_OPTIONS)
			.then((pos) => {
				locationRef.current = pos;
				setStartupFix(pos);
			})
			.catch(() => {
				// denegado o sin señal: fallback silencioso al centro del mapa
			});
	}

	// Re-lee la posición (el repartidor se mueve durante el día). Nunca rechaza:
	// en fallo devuelve el último fix conocido, o null si no hubo ninguno.
	async function getFreshLocation(): Promise<{ lat: number; lng: number } | null> {
		try {
			const pos = await getCurrentPosition(BIAS_OPTIONS);
			locationRef.current = pos;
			return pos;
		} catch {
			return locationRef.current;
		}
	}

	function recordLocation(pos: { lat: number; lng: number }): void {
		locationRef.current = pos;
	}

	return { locationRef, startupFix, requestStartupLocation, getFreshLocation, recordLocation };
}
