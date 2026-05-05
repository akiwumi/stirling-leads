export const SOLO_MONTHLY_CENTS = 4200;
export const SOLO_ANNUAL_CENTS = 40800;
export const TEAM_MONTHLY_CENTS = 14900;
export const TEAM_ANNUAL_CENTS = 142800;
export const TRIAL_DAYS = 2;
export const ENTERPRISE_LABEL = "Custom annual contract";
export const ENTERPRISE_STARTS_AT = "$499/mo equivalent";

export const PLAN_KEYS = {
  SOLO_MONTHLY: "solo_monthly",
  SOLO_ANNUAL: "solo_annual",
  TEAM_MONTHLY: "team_monthly",
  TEAM_ANNUAL: "team_annual",
} as const;

export type PlanKey = (typeof PLAN_KEYS)[keyof typeof PLAN_KEYS];

export function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function getSoloAnnualMonthlyCents() {
  return Math.round(SOLO_ANNUAL_CENTS / 12);
}

export function getSoloAnnualSavingsCents() {
  return SOLO_MONTHLY_CENTS * 12 - SOLO_ANNUAL_CENTS;
}

export function getTeamAnnualMonthlyCents() {
  return Math.round(TEAM_ANNUAL_CENTS / 12);
}

export function getTeamAnnualSavingsCents() {
  return TEAM_MONTHLY_CENTS * 12 - TEAM_ANNUAL_CENTS;
}

export type PricingSummary = {
  trialDays: number;
  solo: {
    monthlyPriceLabel: string;
    annualPriceLabel: string;
    annualMonthlyEquivalentLabel: string;
    annualSavingsLabel: string;
  };
  team: {
    monthlyPriceLabel: string;
    annualPriceLabel: string;
    annualMonthlyEquivalentLabel: string;
    annualSavingsLabel: string;
  };
  enterprise: {
    pricingLabel: string;
    billingLabel: string;
  };
  refundPolicy: string;
};

export function getPricingSummary(): PricingSummary {
  return {
    trialDays: TRIAL_DAYS,
    solo: {
      monthlyPriceLabel: formatUsd(SOLO_MONTHLY_CENTS),
      annualPriceLabel: formatUsd(SOLO_ANNUAL_CENTS),
      annualMonthlyEquivalentLabel: formatUsd(getSoloAnnualMonthlyCents()),
      annualSavingsLabel: formatUsd(getSoloAnnualSavingsCents()),
    },
    team: {
      monthlyPriceLabel: formatUsd(TEAM_MONTHLY_CENTS),
      annualPriceLabel: formatUsd(TEAM_ANNUAL_CENTS),
      annualMonthlyEquivalentLabel: formatUsd(getTeamAnnualMonthlyCents()),
      annualSavingsLabel: formatUsd(getTeamAnnualSavingsCents()),
    },
    enterprise: {
      pricingLabel: ENTERPRISE_STARTS_AT,
      billingLabel: ENTERPRISE_LABEL,
    },
    refundPolicy: "No refunds after the trial. Core workflow stays available across paid plans.",
  };
}
