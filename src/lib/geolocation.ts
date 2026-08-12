export function getCurrentPosition(
	options: PositionOptions = { enableHighAccuracy: true, timeout: 8000 },
): Promise<{ lat: number; lng: number }> {
	return new Promise((resolve, reject) => {
		if (!navigator.geolocation) {
			reject(new Error("Geolocalización no soportada"));
			return;
		}
		navigator.geolocation.getCurrentPosition(
			(pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
			reject,
			options,
		);
	});
}
