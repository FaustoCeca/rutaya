import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StopListItem } from "./StopListItem";

const STOP = { id: "a", label: "Caminito, La Boca", lat: -34.63, lng: -58.36 };

function renderItem(overrides: Partial<Parameters<typeof StopListItem>[0]> = {}) {
	const onToggleDelivered = vi.fn();
	const onRemove = vi.fn();
	const onMakeOrigin = vi.fn();
	render(
		<ul>
			<StopListItem
				stop={STOP}
				visitNumber={2}
				isOrigin={false}
				leg={undefined}
				readonly={false}
				deliverable={false}
				delivered={false}
				onToggleDelivered={onToggleDelivered}
				onRemove={onRemove}
				onMakeOrigin={onMakeOrigin}
				{...overrides}
			/>
		</ul>,
	);
	return { onToggleDelivered, onRemove, onMakeOrigin };
}

afterEach(() => {
	vi.clearAllMocks();
});

describe("StopListItem", () => {
	it("should toggle the delivery by tapping anywhere on the row", async () => {
		// Given
		const user = userEvent.setup();
		const { onToggleDelivered } = renderItem({ readonly: true, deliverable: true });

		// When: el toque cae sobre el texto, no sobre el checkbox
		await user.click(screen.getByText("Caminito, La Boca"));

		// Then
		expect(onToggleDelivered).toHaveBeenCalledTimes(1);
		expect(
			screen.getByRole("checkbox", { name: "Entregada: Caminito, La Boca" }),
		).toBeInTheDocument();
	});

	it("should render a delivered stop checked and crossed out", () => {
		renderItem({ readonly: true, deliverable: true, delivered: true });

		expect(screen.getByRole("checkbox", { name: "Entregada: Caminito, La Boca" })).toBeChecked();
		expect(screen.getByText("Caminito, La Boca")).toHaveClass("line-through");
	});

	it("should not offer the delivery toggle when the stop is not deliverable", () => {
		// origen de un viaje en curso, o preview de un viaje recibido
		renderItem({ readonly: true, deliverable: false });

		expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("should keep the edit actions without any delivery toggle in edit mode", () => {
		renderItem({ readonly: false, deliverable: false });

		expect(screen.getByRole("button", { name: /Empezar la ruta desde/ })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Eliminar Caminito, La Boca" })).toBeInTheDocument();
		expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
	});
});
