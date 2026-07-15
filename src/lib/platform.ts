export type MobilePlatform = "ios" | "android";

export function detectMobilePlatform(): MobilePlatform | null {
	const ua = navigator.userAgent;
	if (/iPhone|iPad|iPod/.test(ua)) return "ios";
	if (/Android/.test(ua)) return "android";
	return null;
}

// true si la app ya está corriendo instalada desde la pantalla de inicio
export function isStandalone(): boolean {
	return (
		window.matchMedia("(display-mode: standalone)").matches ||
		("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true)
	);
}
