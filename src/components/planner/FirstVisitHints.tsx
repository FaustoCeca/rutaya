import { useEffect, useState } from "react";
import { markSeen, wasSeen } from "@/lib/seenFlags";
import { InstallHint } from "./InstallHint";
import { WelcomeTour } from "./WelcomeTour";

const WELCOME_KEY = "rutaya-welcome-seen";

// Encadena los avisos de primera visita: primero cómo usar la app,
// recién al cerrarlo aparece el de instalación (que tiene sus propias condiciones)
export function FirstVisitHints({
	showWelcome,
	onWelcomeDone,
}: {
	showWelcome: boolean;
	onWelcomeDone: () => void;
}) {
	const [welcomeDone, setWelcomeDone] = useState(() => wasSeen(WELCOME_KEY));
	const tourVisible = showWelcome && !welcomeDone;

	// Avisa cuando el tour no está en pantalla, para que el prompt de
	// geolocalización no se apile sobre el overlay de bienvenida.
	useEffect(() => {
		if (!tourVisible) onWelcomeDone();
	}, [tourVisible, onWelcomeDone]);

	if (tourVisible) {
		return (
			<WelcomeTour
				onDone={() => {
					markSeen(WELCOME_KEY);
					setWelcomeDone(true);
				}}
			/>
		);
	}
	return <InstallHint />;
}
