import { useState } from "react";
import type { ImportRow } from "@/hooks/useFileImport";

function RowText({ row }: { row: ImportRow }) {
	return (
		<span className="min-w-0 text-sm">
			<span className="block truncate font-medium text-gray-900">
				{row.locality ? `${row.address}, ${row.locality}` : row.address}
			</span>
			{row.located ? (
				<span className="block truncate text-gray-500 text-xs">{row.located.label}</span>
			) : (
				<span className="block text-red-600 text-xs">No se pudo ubicar en el mapa</span>
			)}
		</span>
	);
}

interface ImportReviewProps {
	rows: ImportRow[];
	maxToAdd: number;
	onConfirm: (stops: { lat: number; lng: number; label: string }[]) => void;
	onCancel: () => void;
}

export function ImportReview({ rows, maxToAdd, onConfirm, onCancel }: ImportReviewProps) {
	const located = rows.filter((r) => r.located);
	const [selected, setSelected] = useState<Set<string>>(
		() => new Set(located.slice(0, maxToAdd).map((r) => r.id)),
	);
	const failed = rows.length - located.length;

	function toggle(id: string) {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else if (next.size < maxToAdd) next.add(id);
			return next;
		});
	}

	function confirm() {
		const stops = rows
			.filter((r) => selected.has(r.id))
			.flatMap((r) =>
				r.located ? [{ lat: r.located.lat, lng: r.located.lng, label: r.located.label }] : [],
			);
		onConfirm(stops);
	}

	return (
		<>
			<h2 className="font-bold text-gray-900 text-lg">Revisá las direcciones</h2>
			<p className="mt-1 text-gray-600 text-sm">
				Encontramos {rows.length} direcciones. Destildá las que no correspondan.
				{failed > 0 && ` ${failed} no se pudieron ubicar en el mapa.`}
			</p>
			{located.length > maxToAdd && (
				<p className="mt-1 text-amber-700 text-xs">
					Se pueden agregar hasta {maxToAdd} paradas a este viaje.
				</p>
			)}
			<ul className="mt-3 max-h-[45dvh] divide-y divide-gray-100 overflow-y-auto">
				{rows.map((row) => (
					<li key={row.id}>
						{row.located ? (
							<label className="flex items-start gap-3 py-2.5">
								<input
									type="checkbox"
									checked={selected.has(row.id)}
									onChange={() => toggle(row.id)}
									className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-600"
								/>
								<RowText row={row} />
							</label>
						) : (
							<div className="flex items-start gap-3 py-2.5">
								<span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center font-bold text-red-500">
									✕
								</span>
								<RowText row={row} />
							</div>
						)}
					</li>
				))}
			</ul>
			<div className="mt-4 flex gap-2">
				<button
					type="button"
					onClick={onCancel}
					className="flex-1 rounded-full border border-gray-300 py-2.5 font-semibold text-gray-700 text-sm"
				>
					Cancelar
				</button>
				<button
					type="button"
					onClick={confirm}
					disabled={selected.size === 0}
					className="flex-1 rounded-full bg-emerald-600 py-2.5 font-semibold text-sm text-white disabled:opacity-40"
				>
					Agregar {selected.size} paradas
				</button>
			</div>
		</>
	);
}
