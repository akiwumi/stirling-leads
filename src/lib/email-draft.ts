import OpenAI from "openai";

type DraftInput = {
  company: {
    name: string;
    websiteUrl: string | null;
    industry: string | null;
    city: string | null;
    country: string | null;
    description: string | null;
  };
  contact: {
    name: string | null;
    role: string | null;
    email: string | null;
  };
  score: {
    category: string | null;
    qrUseCase: string | null;
    reason: string | null;
    recommendedPitch: string | null;
  } | null;
  demoUrl: string | null;
  template: {
    subjectTemplate: string | null;
    bodyTemplate: string | null;
  } | null;
};

export type EmailDraftResult = {
  subject: string;
  body: string;
};

const draftSchema = {
  name: "email_draft",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      subject: { type: "string" },
      body: { type: "string" },
    },
    required: ["subject", "body"],
  },
  strict: true,
} as const;

export async function generateEmailDraft(input: DraftInput) {
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
              "You write short B2B cold outreach for Stirling QR.",
              "Use concrete website evidence only.",
              "Keep tone direct and useful, not spammy.",
              "Mention the QR use case and include the demo link when available.",
              "Return strict JSON only.",
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
        name: draftSchema.name,
        schema: draftSchema.schema,
        strict: true,
      },
    },
  });

  const content = response.output_text;

  if (!content) {
    throw new Error("Empty draft response");
  }

  return JSON.parse(content) as EmailDraftResult;
}
