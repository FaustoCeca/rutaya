export function wasSeen(key: string): boolean {
	try {
		return localStorage.getItem(key) === "1";
	} catch {
		// sin storage no podemos recordar el cierre: mejor no molestar en cada visita
		return true;
	}
}

export function markSeen(key: string): void {
	try {
		localStorage.setItem(key, "1");
	} catch {
		// ignorar
	}
}
