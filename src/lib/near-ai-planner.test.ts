import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  AiPlannerProviderError,
  createNearAiPlanner,
} from "./near-ai-planner";

const input = {
  objective: "Launch a community arts campaign.",
  expectedOutcome: "Publish a campaign page and visual assets.",
  targetAmountMinor: "25000",
};

const plan = {
  summary: "Prepare the campaign launch.",
  tasks: [
    {
      title: "Design campaign assets",
      description: "Create a small set of campaign graphics.",
      category: "design",
      estimatedCost: "20.00",
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("NEAR AI planner adapter", () => {
  it("requests a completion with only the required project planning context", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(plan) } }],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createNearAiPlanner("secret", "model/example").generatePlan(input),
    ).resolves.toEqual(plan);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://cloud-api.near.ai/v1/chat/completions");
    expect(options.headers).toMatchObject({
      Authorization: "Bearer secret",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(options.body)).toMatchObject({
      model: "model/example",
      messages: [
        { role: "system" },
        {
          role: "user",
          content: JSON.stringify({
            objective: input.objective,
            expectedOutcome: input.expectedOutcome,
            targetBudgetUsd: "250.00",
          }),
        },
      ],
    });
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it("surfaces upstream errors without returning provider response contents", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("sensitive provider response", { status: 429 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createNearAiPlanner("secret", "model/example").generatePlan(input),
    ).rejects.toMatchObject({
      name: "AiPlannerProviderError",
      message: "The AI provider returned an error (429).",
    });
  });

  it("rejects malformed completion responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: "nope" } }] }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createNearAiPlanner("secret", "model/example").generatePlan(input),
    ).rejects.toBeInstanceOf(AiPlannerProviderError);
  });

  it("rejects provider responses larger than the supported limit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ oversized: "x".repeat(70 * 1024) }), {
          status: 200,
        }),
      ),
    );

    await expect(
      createNearAiPlanner("secret", "model/example").generatePlan(input),
    ).rejects.toMatchObject({
      message: "The AI provider response exceeded the supported size.",
    });
  });

  it("reports network failures as provider errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("internal network detail")),
    );

    await expect(
      createNearAiPlanner("secret", "model/example").generatePlan(input),
    ).rejects.toMatchObject({
      name: "AiPlannerProviderError",
      message: "The AI provider could not be reached or timed out.",
    });
  });
});
