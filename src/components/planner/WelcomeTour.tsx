import { useEffect, useState } from "react";

const STEPS = [
	{
		title: "Agregá las paradas",
		detail: "Buscá cada dirección o tocá el mapa. El mejor orden de entrega se calcula solo.",
	},
	{
		title: "Importá tu Excel o PDF",
		detail:
			"Si ya tenés la lista de entregas en una planilla o PDF, subila y las direcciones se cargan solas. Solo revisá y confirmá.",
	},
	{
		title: 'Tocá "Crear viaje"',
		detail: "El viaje queda fijo y guardado en tu celular: ningún toque lo puede cambiar.",
	},
	{
		title: "Compartí o navegá",
		detail: 'Mandá el link por WhatsApp o abrilo en Google Maps. Al final, tocá "Terminar viaje".',
	},
];

export function WelcomeTour({ onDone }: { onDone: () => void }) {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => setVisible(true), 600);
		return () => clearTimeout(timer);
	}, []);

	if (!visible) return null;
	return (
		<div className="absolute inset-0 z-[1300]">
			<div className="absolute inset-0 bg-gray-900/50" />
			<section className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl">
				<h2 className="font-bold text-gray-900 text-lg">¡Bienvenido a RutaYa! 👋</h2>
				<p className="mt-1 text-gray-600 text-sm">Armá tu recorrido de entregas en 4 pasos:</p>
				<ol className="mt-4 space-y-3">
					{STEPS.map((step, i) => (
						<li key={step.title} className="flex items-start gap-3">
							<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 font-bold text-white text-xs">
								{i + 1}
							</span>
							<span className="text-sm">
								<strong className="text-gray-900">{step.title}.</strong>{" "}
								<span className="text-gray-700">{step.detail}</span>
							</span>
						</li>
					))}
				</ol>
				<button
					type="button"
					onClick={onDone}
					className="mt-5 w-full rounded-full bg-emerald-600 py-2.5 font-semibold text-sm text-white"
				>
					¡Empezar!
				</button>
			</section>
		</div>
	);
}
