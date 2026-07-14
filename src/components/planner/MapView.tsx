import { useEffect } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { Stop } from "@/hooks/useStops";
import { StopMarkers } from "./StopMarkers";

export const BUENOS_AIRES: [number, number] = [-34.6037, -58.3816];

export interface MapFocusTarget {
	lat: number;
	lng: number;
	seq: number;
}

interface MapViewProps {
	stops: Stop[];
	order: number[] | undefined;
	focus: MapFocusTarget | null;
	onMapTap: (lat: number, lng: number) => void;
	onCenterChange: (lat: number, lng: number) => void;
}

function TapHandler({ onTap }: { onTap: (lat: number, lng: number) => void }) {
	useMapEvents({
		click: (e) => onTap(e.latlng.lat, e.latlng.lng),
	});
	return null;
}

function CenterTracker({ onMove }: { onMove: (lat: number, lng: number) => void }) {
	const map = useMapEvents({
		moveend: () => {
			const c = map.getCenter();
			onMove(c.lat, c.lng);
		},
	});
	return null;
}

function MapFocus({ focus }: { focus: MapFocusTarget | null }) {
	const map = useMap();
	useEffect(() => {
		if (focus) map.flyTo([focus.lat, focus.lng], Math.max(map.getZoom(), 15));
	}, [focus, map]);
	return null;
}

export function MapView({ stops, order, focus, onMapTap, onCenterChange }: MapViewProps) {
	return (
		<div className="absolute inset-0 z-0">
			<MapContainer center={BUENOS_AIRES} zoom={13} zoomControl={false} className="h-full w-full">
				<TileLayer
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
					url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
				/>
				<TapHandler onTap={onMapTap} />
				<CenterTracker onMove={onCenterChange} />
				<MapFocus focus={focus} />
				<StopMarkers stops={stops} order={order} />
			</MapContainer>
		</div>
	);
}
