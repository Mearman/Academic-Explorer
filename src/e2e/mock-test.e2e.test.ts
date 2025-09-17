import { test, describe } from "vitest";
import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

const getPage = (): Page => globalThis.e2ePage;

describe("Mocking Test", () => {
	test("should intercept a simple request", async () => {
		const page = getPage();

		await page.route("https://example.com/api/data", async (route) => {
			console.log("Intercepted example.com request!");
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ message: "Mocked data" }),
			});
		});

		await page.goto("https://example.com");

		const response = await page.evaluate(async () => {
			const res = await fetch("https://example.com/api/data");
			return res.json();
		});

		expect(response).toEqual({ message: "Mocked data" });
	});
});
