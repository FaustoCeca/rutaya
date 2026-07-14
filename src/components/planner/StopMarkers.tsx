import { divIcon } from "leaflet";
import { Marker } from "react-leaflet";
import type { Stop } from "@/hooks/useStops";

interface StopMarkersProps {
	stops: Stop[];
	order: number[] | undefined;
}

// Los labels pueden venir de un link compartido (?r=): siempre escapados antes de
// interpolarlos en el HTML del divIcon
function escapeHtml(text: string): string {
	return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function numberedIcon(num: number, isOrigin: boolean, label: string) {
	const color = isOrigin ? "bg-emerald-600" : "bg-blue-600";
	return divIcon({
		className: "",
		html: `<div title="${escapeHtml(label)}" class="flex h-7 w-7 items-center justify-center rounded-full ${color} text-sm font-bold text-white shadow-md ring-2 ring-white">${num}</div>`,
		iconSize: [28, 28],
		iconAnchor: [14, 14],
	});
}

export function StopMarkers({ stops, order }: StopMarkersProps) {
	return (
		<>
			{stops.map((stop, i) => {
				const visitPos = order?.[i] ?? i;
				return (
					<Marker
						key={stop.id}
						position={[stop.lat, stop.lng]}
						icon={numberedIcon(visitPos + 1, visitPos === 0, stop.label)}
					/>
				);
			})}
		</>
	);
}
