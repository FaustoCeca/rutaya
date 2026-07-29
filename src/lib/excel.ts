const MAX_TEXT_CHARS = 20_000;

// Convierte una planilla (.xlsx/.xls/.csv) al texto crudo que consume la IA.
// El tamaño del archivo ya lo validó readImportFile (importStops.ts).
// SheetJS se carga on-demand para no engordar el bundle inicial.
export async function parseSpreadsheet(file: File): Promise<string> {
	const { read, utils } = await import("xlsx");
	const workbook = read(await file.arrayBuffer());
	const parts: string[] = [];
	for (const name of workbook.SheetNames) {
		const csv = utils.sheet_to_csv(workbook.Sheets[name]).trim();
		if (!csv) continue;
		parts.push(workbook.SheetNames.length > 1 ? `--- Hoja: ${name} ---\n${csv}` : csv);
	}
	const text = parts.join("\n\n").slice(0, MAX_TEXT_CHARS).trim();
	if (!text) throw new Error("La planilla está vacía");
	return text;
}
