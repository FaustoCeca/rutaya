import "@testing-library/jest-dom/vitest";

// Node ≥22 expone un localStorage experimental sin backing file que pisa el de
// jsdom (sus métodos quedan undefined). Lo reemplazamos por uno en memoria.
if (typeof globalThis.localStorage?.clear !== "function") {
	const store = new Map<string, string>();
	const memoryStorage: Storage = {
		get length() {
			return store.size;
		},
		clear: () => store.clear(),
		getItem: (key) => store.get(key) ?? null,
		key: (index) => [...store.keys()][index] ?? null,
		removeItem: (key) => {
			store.delete(key);
		},
		setItem: (key, value) => {
			store.set(key, String(value));
		},
	};
	Object.defineProperty(globalThis, "localStorage", {
		value: memoryStorage,
		configurable: true,
	});
}
