interface ConfirmDialogProps {
	message: string;
	confirmLabel: string;
	onConfirm: () => void;
	onCancel: () => void;
}

export function ConfirmDialog({ message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
	return (
		<div className="absolute inset-0 z-[1400] flex items-center justify-center p-6">
			<button
				type="button"
				aria-label="Cancelar"
				onClick={onCancel}
				className="absolute inset-0 w-full bg-gray-900/50"
			/>
			<div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
				<p className="text-gray-900">{message}</p>
				<div className="mt-4 flex gap-2">
					<button
						type="button"
						onClick={onCancel}
						className="flex-1 rounded-full border border-gray-300 py-2 font-semibold text-gray-700 text-sm"
					>
						Cancelar
					</button>
					<button
						type="button"
						onClick={onConfirm}
						className="flex-1 rounded-full bg-emerald-600 py-2 font-semibold text-sm text-white"
					>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}
