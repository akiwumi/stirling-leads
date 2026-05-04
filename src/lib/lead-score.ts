import OpenAI from "openai";

type LeadScoreInput = {
  company: {
    name: string;
    websiteUrl: string | null;
    industry: string | null;
    city: string | null;
    country: string | null;
    description: string | null;
  };
  evidence: Array<{
    sourceType: string | null;
    sourceUrl: string;
    foundText: string | null;
  }>;
};

export type LeadScoreResult = {
  score: number;
  category: string;
  qrUseCase: string;
  reason: string;
  confidence: number;
  recommendedPitch: string;
};

const scoreSchema = {
  name: "lead_score",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      score: { type: "integer", minimum: 0, maximum: 100 },
      category: { type: "string" },
      qrUseCase: { type: "string" },
      reason: { type: "string" },
      confidence: { type: "integer", minimum: 0, maximum: 100 },
      recommendedPitch: { type: "string" },
    },
    required: ["score", "category", "qrUseCase", "reason", "confidence", "recommendedPitch"],
  },
  strict: true,
} as const;

export async function scoreLeadWithAI(input: LeadScoreInput) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-5.2";

  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: [
              "You score leads for Stirling QR.",
              "Return strict JSON only.",
              "Favor concrete website evidence over assumptions.",
              "High scores mean the company likely benefits from a dynamic QR campaign soon.",
            ].join(" "),
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify(input),
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: scoreSchema.name,
        schema: scoreSchema.schema,
        strict: true,
      },
    },
  });

  const content = response.output_text;

  if (!content) {
    throw new Error("Empty AI score response");
  }

  return JSON.parse(content) as LeadScoreResult;
}
