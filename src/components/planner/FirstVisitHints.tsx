import { useState } from "react";
import { markSeen, wasSeen } from "@/lib/seenFlags";
import { InstallHint } from "./InstallHint";
import { WelcomeTour } from "./WelcomeTour";

const WELCOME_KEY = "rutaya-welcome-seen";

// Encadena los avisos de primera visita: primero cómo usar la app,
// recién al cerrarlo aparece el de instalación (que tiene sus propias condiciones)
export function FirstVisitHints({ showWelcome }: { showWelcome: boolean }) {
	const [welcomeDone, setWelcomeDone] = useState(() => wasSeen(WELCOME_KEY));

	if (showWelcome && !welcomeDone) {
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
