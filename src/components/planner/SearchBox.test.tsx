import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { searchAddresses } from "@/lib/geocoding";
import { SearchBox } from "./SearchBox";

vi.mock("@/lib/geocoding", () => ({ searchAddresses: vi.fn() }));
const mockSearch = vi.mocked(searchAddresses);

const RESULT = { label: "Av. Corrientes 100, CABA", lat: -34.6037, lng: -58.3742 };

function renderSearchBox() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const onSelect = vi.fn();
	const onUseMyLocation = vi.fn();
	render(
		<QueryClientProvider client={client}>
			<SearchBox
				getCenter={() => ({ lat: -34.6, lng: -58.38 })}
				onSelect={onSelect}
				onUseMyLocation={onUseMyLocation}
			/>
		</QueryClientProvider>,
	);
	return { onSelect, onUseMyLocation };
}

afterEach(() => {
	vi.clearAllMocks();
});

describe("SearchBox", () => {
	it("should add the tapped result and clear the input", async () => {
		// Given
		const user = userEvent.setup();
		mockSearch.mockResolvedValue([RESULT]);
		const { onSelect } = renderSearchBox();

		// When
		await user.type(screen.getByRole("searchbox"), "corrientes 100");
		await user.click(await screen.findByRole("button", { name: RESULT.label }));

		// Then
		expect(onSelect).toHaveBeenCalledWith(RESULT);
		expect(screen.getByRole("searchbox")).toHaveValue("");
	});

	it("should pick the first result when pressing Enter", async () => {
		// Given
		const user = userEvent.setup();
		mockSearch.mockResolvedValue([RESULT]);
		const { onSelect } = renderSearchBox();
		await user.type(screen.getByRole("searchbox"), "corrientes 100");
		await screen.findByRole("button", { name: RESULT.label });

		// When
		await user.keyboard("{Enter}");

		// Then
		expect(onSelect).toHaveBeenCalledWith(RESULT);
	});

	it("should offer 'Usar mi ubicación' when focused while empty", async () => {
		// Given
		const user = userEvent.setup();
		const { onUseMyLocation } = renderSearchBox();

		// When
		await user.click(screen.getByRole("searchbox"));
		await user.click(screen.getByRole("button", { name: /usar mi ubicación/i }));

		// Then
		expect(onUseMyLocation).toHaveBeenCalledTimes(1);
		expect(mockSearch).not.toHaveBeenCalled();
	});

	it("should show an error message when the search fails", async () => {
		// Given
		const user = userEvent.setup();
		mockSearch.mockRejectedValue(new Error("caída"));
		renderSearchBox();

		// When
		await user.type(screen.getByRole("searchbox"), "corrientes 100");

		// Then
		expect(await screen.findByText("No se pudo buscar. Probá de nuevo.")).toBeInTheDocument();
	});

	it("should tell the user when there are no results", async () => {
		// Given
		const user = userEvent.setup();
		mockSearch.mockResolvedValue([]);
		renderSearchBox();

		// When
		await user.type(screen.getByRole("searchbox"), "zzzzzz");

		// Then
		expect(await screen.findByText("Sin resultados")).toBeInTheDocument();
	});
});
