import { useFileImport } from "@/hooks/useFileImport";
import { ImportReview } from "./ImportReview";

interface ImportFlowProps {
	file: File;
	getBias: () => Promise<{ lat: number; lng: number }>;
	maxToAdd: number;
	onConfirm: (stops: { lat: number; lng: number; label: string }[]) => void;
	onClose: () => void;
}

export function ImportFlow({ file, getBias, maxToAdd, onConfirm, onClose }: ImportFlowProps) {
	const state = useFileImport(file, getBias);

	return (
		<div className="absolute inset-0 z-[1300]">
			<div className="absolute inset-0 bg-gray-900/50" />
			<section className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl">
				{state.phase === "working" && (
					<div className="flex flex-col items-center gap-3 py-4">
						<span className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
						<p className="text-gray-700 text-sm">{state.message}</p>
						<button
							type="button"
							onClick={onClose}
							className="mt-2 font-medium text-gray-500 text-sm"
						>
							Cancelar
						</button>
					</div>
				)}
				{state.phase === "error" && (
					<>
						<h2 className="font-bold text-gray-900 text-lg">No se pudo importar</h2>
						<p className="mt-1 text-gray-600 text-sm">{state.message}</p>
						<button
							type="button"
							onClick={onClose}
							className="mt-5 w-full rounded-full bg-emerald-600 py-2.5 font-semibold text-sm text-white"
						>
							Cerrar
						</button>
					</>
				)}
				{state.phase === "review" && (
					<ImportReview
						rows={state.rows}
						center={state.center}
						maxToAdd={maxToAdd}
						onConfirm={onConfirm}
						onCancel={onClose}
					/>
				)}
			</section>
		</div>
	);
}
