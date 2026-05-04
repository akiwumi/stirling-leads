export function normalizeWebsiteUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    return `${url.protocol}//${url.hostname}`.toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
}

const blockedSearchDomains = [
  "booking.com",
  "tripadvisor.com",
  "tripadvisor.co.uk",
  "yelp.com",
  "expedia.com",
  "hotels.com",
  "kayak.com",
  "trivago.com",
  "airbnb.com",
  "laterooms.com",
  "visitscotland.com",
  "visitscotland.com",
  "cntraveller.com",
  "timeout.com",
  "opentable.com",
  "designmynight.com",
  "agoda.com",
  "skyscanner.net",
  "rome2rio.com",
  "yellowpages.com",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "tiktok.com",
  "x.com",
];

const blockedSearchTerms = [
  "best hotels",
  "top hotels",
  "recommended",
  "near me",
  "compare prices",
  "things to do",
  "places to stay",
  "where to stay",
  "travel guide",
  "book now",
  "find deals",
  "cheap hotels",
  "review",
  "reviews",
  "directory",
  "aggregator",
  "list of",
  "top 10",
  "top 20",
];

const nicheBlockedDomains: Record<string, string[]> = {
  hotel: ["booking.com", "tripadvisor.com", "expedia.com", "hotels.com", "trivago.com", "agoda.com", "airbnb.com"],
  restaurant: ["tripadvisor.com", "yelp.com", "opentable.com", "deliveroo.co.uk", "ubereats.com", "just-eat.co.uk"],
  venue: ["designmynight.com", "eventbrite.com", "tripadvisor.com", "yelp.com"],
  estate: ["rightmove.co.uk", "zoopla.co.uk", "onthemarket.com", "primelocation.com"],
};

const nicheBlockedTerms: Record<string, string[]> = {
  hotel: ["best hotels", "places to stay", "where to stay", "compare prices", "book now", "deals", "from £", "from $", "per night"],
  restaurant: ["best restaurants", "food guide", "delivery", "takeaway", "table reservations"],
  venue: ["things to do", "what's on", "events near", "event guide"],
  estate: ["property portal", "houses for sale", "property listings", "estate agent directory"],
};

export function isLikelyAggregatorSite(url: string, title: string, snippet?: string, niche?: string) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "").toLowerCase();

    if (blockedSearchDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) {
      return true;
    }

    const nicheKey = inferNicheKey(niche);

    if (nicheKey && (nicheBlockedDomains[nicheKey] ?? []).some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) {
      return true;
    }
  } catch {
    return true;
  }

  const haystack = `${title} ${snippet ?? ""}`.toLowerCase();
  if (blockedSearchTerms.some((term) => haystack.includes(term))) {
    return true;
  }

  const nicheKey = inferNicheKey(niche);
  if (nicheKey && (nicheBlockedTerms[nicheKey] ?? []).some((term) => haystack.includes(term))) {
    return true;
  }

  return /(^|[\s|:-])(best|top)\s+\d*/i.test(title) || /(directory|guide|portal|collection)/i.test(haystack);
}

export function extractCompanyName(title: string, hostname: string) {
  const cleanedTitle = title
    .split(/[|\-–—]/)[0]
    ?.trim()
    ?.replace(/\s+/g, " ");

  if (cleanedTitle && cleanedTitle.length > 2) {
    return cleanedTitle;
  }

  const domainPart = hostname.replace(/^www\./, "").split(".")[0] ?? "Unknown company";
  return domainPart.charAt(0).toUpperCase() + domainPart.slice(1);
}

export function buildSearchQuery(niche: string, location: string) {
  const baseQuery = `${niche} ${location}`;
  const nicheKey = inferNicheKey(niche);
  const commonExclusions = ["booking.com", "tripadvisor.com", "yelp.com", "facebook.com", "instagram.com", "linkedin.com"];
  const nicheExclusions = nicheKey ? nicheBlockedDomains[nicheKey] ?? [] : [];
  const exclusions = Array.from(new Set([...commonExclusions, ...nicheExclusions]));
  const focusPhrase = getSearchFocusPhrase(nicheKey);

  return `${baseQuery} ${focusPhrase} ${exclusions.map((domain) => `-site:${domain}`).join(" ")}`.trim();
}

function inferNicheKey(niche?: string) {
  const value = niche?.toLowerCase() ?? "";

  if (/(hotel|inn|guesthouse|resort|hostel|lodg)/i.test(value)) {
    return "hotel";
  }

  if (/(restaurant|cafe|bar|bistro|pub|food)/i.test(value)) {
    return "restaurant";
  }

  if (/(venue|event|wedding|hall|conference)/i.test(value)) {
    return "venue";
  }

  if (/(estate|property|real estate|letting)/i.test(value)) {
    return "estate";
  }

  return null;
}

function getSearchFocusPhrase(nicheKey: string | null) {
  if (nicheKey === "hotel") {
    return '"official site" OR "hotel" -"compare prices" -"places to stay" -"best hotels" -"per night" -"book now"';
  }

  if (nicheKey === "restaurant") {
    return '"official site" OR menu OR booking';
  }

  if (nicheKey === "venue") {
    return '"official site" OR booking OR events';
  }

  if (nicheKey === "estate") {
    return '"official site" OR valuations OR lettings';
  }

  return '"official site"';
}
