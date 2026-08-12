import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FirstVisitHints } from "./FirstVisitHints";

vi.mock("./WelcomeTour", () => ({
	WelcomeTour: ({ onDone }: { onDone: () => void }) => (
		<button type="button" onClick={onDone}>
			cerrar tour
		</button>
	),
}));
vi.mock("./InstallHint", () => ({ InstallHint: () => null }));

beforeEach(() => {
	localStorage.clear();
});

afterEach(() => {
	vi.clearAllMocks();
});

describe("FirstVisitHints", () => {
	it("should fire onWelcomeDone only after dismissing the tour on a first visit", async () => {
		const user = userEvent.setup();
		const onWelcomeDone = vi.fn();
		render(<FirstVisitHints showWelcome onWelcomeDone={onWelcomeDone} />);

		expect(onWelcomeDone).not.toHaveBeenCalled();

		await user.click(screen.getByRole("button", { name: "cerrar tour" }));

		expect(onWelcomeDone).toHaveBeenCalled();
	});

	it("should fire onWelcomeDone on mount for a repeat visit", () => {
		localStorage.setItem("rutaya-welcome-seen", "1");
		const onWelcomeDone = vi.fn();

		render(<FirstVisitHints showWelcome onWelcomeDone={onWelcomeDone} />);

		expect(onWelcomeDone).toHaveBeenCalled();
		expect(screen.queryByRole("button", { name: "cerrar tour" })).not.toBeInTheDocument();
	});

	it("should fire onWelcomeDone on mount when the tour is not applicable", () => {
		const onWelcomeDone = vi.fn();

		render(<FirstVisitHints showWelcome={false} onWelcomeDone={onWelcomeDone} />);

		expect(onWelcomeDone).toHaveBeenCalled();
	});
});
