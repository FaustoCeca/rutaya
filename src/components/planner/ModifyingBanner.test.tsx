import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModifyingBanner } from "./ModifyingBanner";

describe("ModifyingBanner", () => {
	it("should announce the modify session", () => {
		render(<ModifyingBanner onDiscard={vi.fn()} />);

		expect(screen.getByText("Estás modificando tu viaje en curso")).toBeInTheDocument();
	});

	it("should report the discard action", async () => {
		// Given
		const user = userEvent.setup();
		const onDiscard = vi.fn();
		render(<ModifyingBanner onDiscard={onDiscard} />);

		// When
		await user.click(screen.getByRole("button", { name: "Descartar cambios" }));

		// Then
		expect(onDiscard).toHaveBeenCalledTimes(1);
	});
});
