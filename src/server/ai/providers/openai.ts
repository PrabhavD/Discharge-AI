import { DocumentType } from "@prisma/client";
import { AiInput } from "../types";
import { SYSTEM_PROMPT } from "../prompts/system";

export class OpenAiProvider {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY ?? "";
    this.model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  }

  private async callOpenAi(userPrompt: string): Promise<string> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
    const data = await res.json();
    return data.choices[0].message.content as string;
  }

  async generateReadinessSummary(input: AiInput) {
    const { ReadinessSummaryJsonSchema } = await import("../schemas/discharge-plan.schema");
    const text = await this.callOpenAi(this.buildPrompt(input, "readiness summary"));
    return ReadinessSummaryJsonSchema.parse(JSON.parse(text));
  }

  async generateDischargePlan(input: AiInput) {
    const { DischargePlanJsonSchema } = await import("../schemas/discharge-plan.schema");
    const text = await this.callOpenAi(this.buildPrompt(input, "discharge plan"));
    return DischargePlanJsonSchema.parse(JSON.parse(text));
  }

  async generateDraftDocument(input: AiInput, type: DocumentType) {
    const text = await this.callOpenAi(this.buildPrompt(input, `draft ${type}`));
    return JSON.parse(text) as { type: string; title: string; content: string };
  }

  private buildPrompt(input: AiInput, outputType: string): string {
    return `Generate a ${outputType} as JSON for discharge coordination.
Patient: ${JSON.stringify(input.patient)}
Encounter: ${JSON.stringify(input.encounter)}
Snapshot: ${JSON.stringify(input.snapshot)}
Answers: ${JSON.stringify(input.answers)}
Notes: ${JSON.stringify(input.freeTextNotes)}`;
  }
}
