import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import type { Stop } from "@/hooks/useStops";
import { StopMarkers } from "./StopMarkers";

const BUENOS_AIRES: [number, number] = [-34.6037, -58.3816];

interface MapViewProps {
	stops: Stop[];
	order: number[] | undefined;
	onMapTap: (lat: number, lng: number) => void;
}

function TapHandler({ onTap }: { onTap: (lat: number, lng: number) => void }) {
	useMapEvents({
		click: (e) => onTap(e.latlng.lat, e.latlng.lng),
	});
	return null;
}

export function MapView({ stops, order, onMapTap }: MapViewProps) {
	return (
		<div className="absolute inset-0 z-0">
			<MapContainer center={BUENOS_AIRES} zoom={13} zoomControl={false} className="h-full w-full">
				<TileLayer
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
					url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
				/>
				<TapHandler onTap={onMapTap} />
				<StopMarkers stops={stops} order={order} />
			</MapContainer>
		</div>
	);
}
