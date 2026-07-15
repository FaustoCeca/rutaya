import { type ReactNode, useEffect, useState } from "react";
import { detectMobilePlatform, isStandalone, type MobilePlatform } from "@/lib/platform";

const STORAGE_KEY = "rutaya-install-hint-seen";

function wasSeen(): boolean {
	try {
		return localStorage.getItem(STORAGE_KEY) === "1";
	} catch {
		// sin storage no podemos recordar el cierre: mejor no molestar en cada visita
		return true;
	}
}

function markSeen() {
	try {
		localStorage.setItem(STORAGE_KEY, "1");
	} catch {
		// ignorar
	}
}

function ShareIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className="inline h-4 w-4 align-text-bottom text-blue-600"
			aria-hidden="true"
		>
			<path d="M12 3v12M8 6l4-4 4 4M5 10v10h14V10" />
		</svg>
	);
}

function stepsFor(platform: MobilePlatform): ReactNode[] {
	if (platform === "ios") {
		return [
			<span key="1">
				Tocá el botón <ShareIcon /> <strong>Compartir</strong> en la barra del navegador
			</span>,
			<span key="2">
				Deslizá hacia abajo y elegí <strong>"Agregar a pantalla de inicio"</strong>
			</span>,
			<span key="3">
				Confirmá tocando <strong>"Agregar"</strong>
			</span>,
		];
	}
	return [
		<span key="1">
			Tocá el menú <strong>⋮</strong> arriba a la derecha
		</span>,
		<span key="2">
			Elegí <strong>"Agregar a la pantalla principal"</strong> (o "Instalar app")
		</span>,
		<span key="3">
			Confirmá tocando <strong>"Agregar"</strong>
		</span>,
	];
}

export function InstallHint() {
	const [platform, setPlatform] = useState<MobilePlatform | null>(null);

	useEffect(() => {
		const detected = detectMobilePlatform();
		if (!detected || isStandalone() || wasSeen()) return;
		// pequeña espera para que primero se vea el mapa (o la ruta compartida)
		const timer = setTimeout(() => setPlatform(detected), 1200);
		return () => clearTimeout(timer);
	}, []);

	if (!platform) return null;

	function dismiss() {
		markSeen();
		setPlatform(null);
	}

	return (
		<div className="absolute inset-0 z-[1300]">
			<button
				type="button"
				aria-label="Cerrar tutorial"
				onClick={dismiss}
				className="absolute inset-0 w-full bg-gray-900/50"
			/>
			<section className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl">
				<h2 className="font-bold text-gray-900 text-lg">Instalá RutaYa en tu celular 📲</h2>
				<p className="mt-1 text-gray-600 text-sm">
					Agregala a la pantalla de inicio y abrila con un toque, como cualquier app.
				</p>
				<ol className="mt-4 space-y-3">
					{stepsFor(platform).map((step, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: lista estática de 3 pasos
						<li key={i} className="flex items-start gap-3">
							<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 font-bold text-white text-xs">
								{i + 1}
							</span>
							<span className="text-gray-800 text-sm">{step}</span>
						</li>
					))}
				</ol>
				<button
					type="button"
					onClick={dismiss}
					className="mt-5 w-full rounded-full bg-emerald-600 py-2.5 font-semibold text-sm text-white"
				>
					Entendido
				</button>
			</section>
		</div>
	);
}
