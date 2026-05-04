import QRCode from "qrcode";

type DemoConfigInput = {
  companyName: string;
  city: string | null;
  industry: string | null;
  websiteUrl: string | null;
  qrUseCase: string | null;
  recommendedPitch: string | null;
};

export type DemoLandingConfig = {
  eyebrow: string;
  headline: string;
  body: string;
  primaryLabel: string;
  primaryUrl: string;
  secondaryLabel: string;
};

export function buildDemoLandingConfig(input: DemoConfigInput) {
  const useCase = input.qrUseCase || defaultUseCaseForIndustry(input.industry);

  return {
    eyebrow: `${input.companyName} demo`,
    headline: `${useCase} for ${input.companyName}`,
    body:
      input.recommendedPitch ||
      `Scan once and send visitors to a flexible landing page that ${input.companyName} can update without reprinting QR materials.`,
    primaryLabel: "Open the live destination",
    primaryUrl: input.websiteUrl || "#",
    secondaryLabel: input.city ? `Built for ${input.city}` : "Dynamic QR demo",
  } satisfies DemoLandingConfig;
}

export async function buildQrCodeDataUrl(url: string) {
  return QRCode.toDataURL(url, {
    width: 320,
    margin: 1,
    color: {
      dark: "#214f43",
      light: "#f7f7f2",
    },
  });
}

function defaultUseCaseForIndustry(industry: string | null) {
  const value = industry?.toLowerCase() ?? "";

  if (/(restaurant|cafe|bar|food)/i.test(value)) {
    return "A dynamic menu QR landing page";
  }

  if (/(hotel|venue|event)/i.test(value)) {
    return "An events and booking QR landing page";
  }

  if (/(estate|property|real estate)/i.test(value)) {
    return "A live property listings QR landing page";
  }

  return "A dynamic QR landing page";
}
