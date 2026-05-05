import OpenAI from "openai";

import type { WebsitePage } from "@/lib/website-intelligence";

export type AiExtractedPerson = {
  name: string;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  sourceUrl: string;
  evidenceText: string;
  confidence: number;
};

export type AiWebsiteEnrichment = {
  postalAddress: string | null;
  postalAddressSourceUrl: string | null;
  companyLinkedinUrl: string | null;
  people: AiExtractedPerson[];
  notes: string[];
};

const enrichmentSchema = {
  name: "website_enrichment",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      postalAddress: { type: ["string", "null"] },
      postalAddressSourceUrl: { type: ["string", "null"] },
      companyLinkedinUrl: { type: ["string", "null"] },
      notes: {
        type: "array",
        items: { type: "string" },
      },
      people: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string" },
            jobTitle: { type: ["string", "null"] },
            email: { type: ["string", "null"] },
            phone: { type: ["string", "null"] },
            linkedinUrl: { type: ["string", "null"] },
            sourceUrl: { type: "string" },
            evidenceText: { type: "string" },
            confidence: { type: "integer", minimum: 0, maximum: 100 },
          },
          required: ["name", "jobTitle", "email", "phone", "linkedinUrl", "sourceUrl", "evidenceText", "confidence"],
        },
      },
    },
    required: ["postalAddress", "postalAddressSourceUrl", "companyLinkedinUrl", "notes", "people"],
  },
  strict: true,
} as const;

export async function extractWebsiteEnrichmentWithAI(input: {
  companyName?: string | null;
  websiteUrl: string;
  pages: WebsitePage[];
}): Promise<AiWebsiteEnrichment> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || input.pages.length === 0) {
    return {
      postalAddress: null,
      postalAddressSourceUrl: null,
      companyLinkedinUrl: null,
      people: [],
      notes: [],
    };
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-5.2";
  const pagePayload = input.pages.slice(0, 8).map((page) => ({
    url: page.url,
    title: page.title,
    text: truncate(page.text, 4500),
  }));

  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: [
              "You extract B2B lead intelligence from company websites.",
              "Return strict JSON only.",
              "Use only facts explicitly present in the supplied page text.",
              "Do not invent names, roles, emails, phones, or addresses.",
              "Prefer decision makers and public work contact details.",
              "Return up to 15 people.",
              "If the page includes a company LinkedIn URL, return it.",
              "If multiple addresses exist, prefer headquarters or main public contact address.",
            ].join(" "),
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              companyName: input.companyName ?? null,
              websiteUrl: input.websiteUrl,
              pages: pagePayload,
            }),
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: enrichmentSchema.name,
        schema: enrichmentSchema.schema,
        strict: true,
      },
    },
  });

  const content = response.output_text;
  if (!content) {
    return {
      postalAddress: null,
      postalAddressSourceUrl: null,
      companyLinkedinUrl: null,
      people: [],
      notes: [],
    };
  }

  return JSON.parse(content) as AiWebsiteEnrichment;
}

function truncate(value: string, length: number) {
  if (value.length <= length) return value;
  return `${value.slice(0, length)}…`;
}
