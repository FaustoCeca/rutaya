import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { type GeocodeResult, searchAddresses } from "@/lib/geocoding";

interface SearchBoxProps {
	getCenter: () => { lat: number; lng: number };
	onSelect: (result: GeocodeResult) => void;
	onUseMyLocation: () => void;
}

function useDebounced(value: string, delayMs: number): string {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delayMs);
		return () => clearTimeout(timer);
	}, [value, delayMs]);
	return debounced;
}

export function SearchBox({ getCenter, onSelect, onUseMyLocation }: SearchBoxProps) {
	const [text, setText] = useState("");
	const [focused, setFocused] = useState(false);
	const query = useDebounced(text.trim(), 300);

	const { data, isError, isFetching } = useQuery({
		queryKey: ["geocode", query],
		queryFn: () => searchAddresses(query, getCenter()),
		enabled: focused && query.length >= 3,
		staleTime: 5 * 60 * 1000,
	});

	const showResults = focused && text.trim().length >= 3;
	const showMyLocation = focused && text.length === 0;

	function handleSelect(result: GeocodeResult) {
		onSelect(result);
		setText("");
		setFocused(false);
	}

	return (
		<div className="absolute inset-x-3 top-3 z-[1100]">
			<div className="overflow-hidden rounded-2xl bg-white shadow-lg">
				<input
					type="search"
					value={text}
					onChange={(e) => setText(e.target.value)}
					onFocus={() => setFocused(true)}
					onBlur={() => setFocused(false)}
					placeholder="Buscar dirección…"
					autoComplete="off"
					className="w-full bg-transparent px-4 py-3 text-base outline-none"
				/>
				{(showResults || showMyLocation) && (
					// biome-ignore lint/a11y/noStaticElementInteractions: evita que el blur del input cierre el dropdown antes del click
					<div onMouseDown={(e) => e.preventDefault()} className="border-gray-100 border-t">
						{showMyLocation && (
							<button
								type="button"
								onClick={() => {
									setFocused(false);
									onUseMyLocation();
								}}
								className="flex w-full items-center gap-2 px-4 py-3 text-left font-medium text-emerald-700 text-sm"
							>
								<svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
									<path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
								</svg>
								Usar mi ubicación
							</button>
						)}
						{showResults && isFetching && !data && (
							<p className="px-4 py-3 text-gray-500 text-sm">Buscando…</p>
						)}
						{showResults && isError && (
							<p className="px-4 py-3 text-gray-500 text-sm">No se pudo buscar. Probá de nuevo.</p>
						)}
						{showResults && data && data.length === 0 && (
							<p className="px-4 py-3 text-gray-500 text-sm">Sin resultados</p>
						)}
						{showResults &&
							data?.map((result) => (
								<button
									key={`${result.lat},${result.lng}`}
									type="button"
									onClick={() => handleSelect(result)}
									className="block w-full truncate px-4 py-3 text-left text-sm hover:bg-gray-50"
								>
									{result.label}
								</button>
							))}
					</div>
				)}
			</div>
		</div>
	);
}
