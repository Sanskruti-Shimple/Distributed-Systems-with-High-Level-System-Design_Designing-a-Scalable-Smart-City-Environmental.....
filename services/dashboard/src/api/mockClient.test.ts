import { afterEach, describe, expect, it } from "vitest";
import { mockClient } from "./mockClient";
import { setPreviewState } from "./previewState";

afterEach(() => setPreviewState("data"));

describe("Metrovale mock API", () => {
  it("returns the approved city sensor records in data state", async () => {
    setPreviewState("data");
    const response = await mockClient.listSensors();

    expect(response.items.map((sensor) => sensor.id)).toEqual([
      "MV-021",
      "MV-034",
      "MV-048",
    ]);
    expect(response.items[2]?.freshnessLabel).toBe("4 min ago");
  });

  it("returns empty collections in empty preview state", async () => {
    setPreviewState("empty");
    const response = await mockClient.listAlerts();

    expect(response.items).toEqual([]);
  });

  it("rejects requests in error preview state", async () => {
    setPreviewState("error");

    await expect(mockClient.getHealth()).rejects.toThrow(
      "temporarily unavailable",
    );
  });
});
