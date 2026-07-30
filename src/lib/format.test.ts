import { formatDistance, formatDuration } from "./format";

describe("formatDuration", () => {
	it("should return 'menos de 1 min' when under half a minute", () => {
		expect(formatDuration(20)).toBe("menos de 1 min");
	});

	it("should format minutes only when under an hour", () => {
		expect(formatDuration(60)).toBe("1 min");
		expect(formatDuration(59 * 60)).toBe("59 min");
	});

	it("should format exact hours without minutes", () => {
		expect(formatDuration(3600)).toBe("1 h");
		expect(formatDuration(7200)).toBe("2 h");
	});

	it("should pad minutes to two digits when mixing hours and minutes", () => {
		expect(formatDuration(3660)).toBe("1 h 01 min");
		expect(formatDuration(2 * 3600 + 12 * 60)).toBe("2 h 12 min");
	});

	it("should round seconds to the nearest minute", () => {
		expect(formatDuration(89)).toBe("1 min");
		expect(formatDuration(91)).toBe("2 min");
	});
});

describe("formatDistance", () => {
	it("should format meters when under a kilometer", () => {
		expect(formatDistance(500)).toBe("500 m");
		expect(formatDistance(999.4)).toBe("999 m");
	});

	it("should format kilometers with es-AR decimal comma", () => {
		expect(formatDistance(1000)).toBe("1 km");
		expect(formatDistance(12_345)).toBe("12,3 km");
	});
});
