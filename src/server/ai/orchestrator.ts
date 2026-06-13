import { DocumentType } from "@prisma/client";
import { MockAiProvider } from "./providers/mock";
import { AiProvider } from "./types";

export function getAiProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER ?? "mock";
  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    const { OpenAiProvider } = require("./providers/openai") as {
      OpenAiProvider: new () => AiProvider;
    };
    return new OpenAiProvider();
  }
  return new MockAiProvider();
}

export async function generateWithProvider<T>(
  fn: (provider: AiProvider) => Promise<T>
): Promise<T> {
  return fn(getAiProvider());
}

export type { AiInput } from "./types";
