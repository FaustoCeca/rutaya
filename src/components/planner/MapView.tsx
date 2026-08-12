import { latLngBounds } from "leaflet";
import { useEffect, useRef } from "react";
import { MapContainer, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
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
	geometry: [number, number][] | undefined;
	focus: MapFocusTarget | null;
	gpsCenter: { lat: number; lng: number } | null;
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

// Centra una sola vez en la posición GPS inicial, sin animación ni cambio de
// zoom (13 = vista ciudad, coherente con el propósito de sesgo por cercanía).
function GpsCenter({ target }: { target: { lat: number; lng: number } | null }) {
	const map = useMap();
	const done = useRef(false);
	useEffect(() => {
		if (target && !done.current) {
			done.current = true;
			map.setView([target.lat, target.lng]);
		}
	}, [target, map]);
	return null;
}

function MapFocus({ focus }: { focus: MapFocusTarget | null }) {
	const map = useMap();
	useEffect(() => {
		if (focus) map.flyTo([focus.lat, focus.lng], Math.max(map.getZoom(), 15));
	}, [focus, map]);
	return null;
}

function FitRoute({ geometry }: { geometry: [number, number][] | undefined }) {
	const map = useMap();
	useEffect(() => {
		if (geometry && geometry.length > 1) {
			// padding inferior extra para que el StopsSheet no tape la ruta
			map.fitBounds(latLngBounds(geometry), {
				paddingTopLeft: [40, 80],
				paddingBottomRight: [40, 180],
			});
		}
	}, [geometry, map]);
	return null;
}

export function MapView({
	stops,
	order,
	geometry,
	focus,
	gpsCenter,
	onMapTap,
	onCenterChange,
}: MapViewProps) {
	return (
		<div className="absolute inset-0 z-0">
			<MapContainer center={BUENOS_AIRES} zoom={13} zoomControl={false} className="h-full w-full">
				<TileLayer
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
					url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
				/>
				<TapHandler onTap={onMapTap} />
				<CenterTracker onMove={onCenterChange} />
				<GpsCenter target={gpsCenter} />
				<MapFocus focus={focus} />
				<FitRoute geometry={geometry} />
				{geometry && (
					<Polyline
						positions={geometry}
						pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.8 }}
					/>
				)}
				<StopMarkers stops={stops} order={order} />
			</MapContainer>
		</div>
	);
}
