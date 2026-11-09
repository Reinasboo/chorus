import "server-only";

import { z } from "zod";
import type { AiPlannerProvider } from "./ai-planning";
import { usdInputFromMinorUnits } from "./money";

const NEAR_AI_COMPLETIONS_URL =
  "https://cloud-api.near.ai/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RESPONSE_BYTES = 64 * 1024;
const chatCompletionSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({ content: z.string() }),
    }),
  ).min(1),
});

export class AiPlannerProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiPlannerProviderError";
  }
}

export function isNearAiPlannerConfigured() {
  return Boolean(
    process.env.NEAR_AI_API_KEY?.trim() && process.env.NEAR_AI_MODEL?.trim(),
  );
}

export function createNearAiPlanner(
  apiKey: string,
  model: string,
): AiPlannerProvider {
  return {
    async generatePlan(input) {
      let response: Response;
      try {
        response = await fetch(NEAR_AI_COMPLETIONS_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content:
                  "Create a practical project plan as JSON with exactly this shape: {\"summary\":\"...\",\"tasks\":[{\"title\":\"...\",\"description\":\"...\",\"category\":\"...\",\"estimatedCost\":\"0.00\"}]}. Return 1 to 12 tasks. Use USD estimates with at most two decimal places. Keep the total estimate within the supplied target budget. Do not name or claim to verify real providers, offers, prices, or services. Estimates are planning suggestions only, not quotes or spending authorization. Return JSON only.",
              },
              {
                role: "user",
                content: JSON.stringify({
                  objective: input.objective,
                  expectedOutcome: input.expectedOutcome,
                  targetBudgetUsd: usdInputFromMinorUnits(
                    input.targetAmountMinor,
                  ),
                }),
              },
            ],
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch {
        throw new AiPlannerProviderError(
          "The AI provider could not be reached or timed out.",
        );
      }

      if (!response.ok) {
        throw new AiPlannerProviderError(
          `The AI provider returned an error (${response.status}).`,
        );
      }

      let responseText: string;
      try {
        responseText = await response.text();
      } catch {
        throw new AiPlannerProviderError(
          "The AI provider returned an unreadable response.",
        );
      }

      if (new TextEncoder().encode(responseText).byteLength > MAX_RESPONSE_BYTES) {
        throw new AiPlannerProviderError(
          "The AI provider response exceeded the supported size.",
        );
      }

      let payload: unknown;
      try {
        payload = JSON.parse(responseText) as unknown;
      } catch {
        throw new AiPlannerProviderError(
          "The AI provider returned an unreadable response.",
        );
      }

      const completion = chatCompletionSchema.safeParse(payload);
      if (!completion.success) {
        throw new AiPlannerProviderError(
          "The AI provider response did not contain a plan.",
        );
      }

      try {
        return JSON.parse(completion.data.choices[0].message.content) as unknown;
      } catch {
        throw new AiPlannerProviderError(
          "The AI provider returned a plan that was not valid JSON.",
        );
      }
    },
  };
}

export function getNearAiPlanner() {
  const apiKey = process.env.NEAR_AI_API_KEY?.trim();
  const model = process.env.NEAR_AI_MODEL?.trim();
  if (!apiKey || !model) return null;
  return createNearAiPlanner(apiKey, model);
}
