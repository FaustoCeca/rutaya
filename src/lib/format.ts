export function formatDuration(seconds: number): string {
	const totalMinutes = Math.round(seconds / 60);
	if (totalMinutes < 1) return "menos de 1 min";
	if (totalMinutes < 60) return `${totalMinutes} min`;
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return minutes > 0 ? `${hours} h ${String(minutes).padStart(2, "0")} min` : `${hours} h`;
}

export function formatDistance(meters: number): string {
	if (meters < 1000) return `${Math.round(meters)} m`;
	return `${(meters / 1000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} km`;
}
