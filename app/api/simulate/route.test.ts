import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/client", () => ({ getSql: () => async () => [] }));
import { POST } from "./route";

describe("simulation API monetary contract", () => {
  it("returns explicit integer-cent fields and reconciled breakdowns", async () => {
    const response = await POST(new Request("http://localhost/api/simulate", { method: "POST", body: JSON.stringify({ injectOutage: true }) }));
    expect(response.status).toBe(200);
    const body: unknown = await response.json();
    expect(body).toMatchObject({ totalCostCents: 16543, costCentsByTenant: { acme: 5396, beta: 5540, gamma: 5607 }, costCentsByFeature: { cheap: 1495, long: 15048 } });
    expect(body).not.toHaveProperty("totalCost");
  });
});
