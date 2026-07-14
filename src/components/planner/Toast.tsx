import { useEffect } from "react";

interface ToastProps {
	message: string | null;
	onDismiss: () => void;
}

export function Toast({ message, onDismiss }: ToastProps) {
	useEffect(() => {
		if (!message) return;
		const timer = setTimeout(onDismiss, 3000);
		return () => clearTimeout(timer);
	}, [message, onDismiss]);

	if (!message) return null;
	return (
		<output className="absolute top-16 left-1/2 z-[1200] -translate-x-1/2 rounded-full bg-gray-900/90 px-4 py-2 text-sm text-white shadow-lg">
			{message}
		</output>
	);
}
