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
  "restaurantguru.com",
  "squaremeal.co.uk",
  "visitlondon.com",
  "visitengland.com",
  "visitscotland.org",
  "visitbritain.com",
  "thefork.com",
  "resdiary.com",
  "tagvenue.com",
  "functionfixers.co.uk",
  "browsealoud.com",
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
  "official guide",
  "visitor guide",
  "tourism",
  "travel inspiration",
  "discover",
  "browse",
  "find your",
  "find the best",
];

const blockedPathTerms = [
  "/hotels/",
  "/hotel/",
  "/restaurants/",
  "/restaurant/",
  "/venues/",
  "/venue/",
  "/estate-agents/",
  "/estate-agent/",
  "/properties/",
  "/listings/",
  "/listing/",
  "/directory/",
  "/guide/",
  "/guides/",
  "/best-",
  "/top-",
  "/near-",
  "/search",
];

const blockedHostnameTerms = ["visit", "guide", "directory", "discover", "best", "top10", "portal"];

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
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.replace(/^www\./, "").toLowerCase();
    const pathname = parsedUrl.pathname.toLowerCase();

    if (blockedSearchDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) {
      return true;
    }

    if (blockedHostnameTerms.some((term) => hostname.includes(term))) {
      return true;
    }

    if (blockedPathTerms.some((term) => pathname.includes(term))) {
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

  if (looksLikeLocationListing(title, niche)) {
    return true;
  }

  return /(^|[\s|:-])(best|top)\s+\d*/i.test(title) || /(directory|guide|portal|collection|roundup|recommendation)/i.test(haystack);
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

const countryAliases: Array<{ country: string; terms: string[] }> = [
  { country: "United Kingdom", terms: ["united kingdom", "uk", "great britain", "england", "scotland", "wales", "northern ireland"] },
  { country: "Sweden", terms: ["sweden"] },
  { country: "Norway", terms: ["norway"] },
  { country: "Denmark", terms: ["denmark"] },
  { country: "Finland", terms: ["finland"] },
  { country: "Ireland", terms: ["ireland"] },
  { country: "France", terms: ["france"] },
  { country: "Germany", terms: ["germany"] },
  { country: "Spain", terms: ["spain"] },
  { country: "Italy", terms: ["italy"] },
  { country: "Portugal", terms: ["portugal"] },
  { country: "Netherlands", terms: ["netherlands", "holland"] },
  { country: "Belgium", terms: ["belgium"] },
  { country: "Switzerland", terms: ["switzerland"] },
  { country: "Austria", terms: ["austria"] },
  { country: "Poland", terms: ["poland"] },
  { country: "Czech Republic", terms: ["czech republic", "czechia"] },
  { country: "United States", terms: ["united states", "usa", "us"] },
  { country: "Canada", terms: ["canada"] },
  { country: "Australia", terms: ["australia"] },
  { country: "New Zealand", terms: ["new zealand"] },
];

const cityCountryHints: Array<{ country: string; cities: string[] }> = [
  {
    country: "United Kingdom",
    cities: [
      // Scotland
      "stirling", "glasgow", "edinburgh", "aberdeen", "dundee", "inverness", "perth", "st andrews",
      "fort william", "oban", "aviemore", "falkirk", "kilmarnock", "ayr", "paisley", "motherwell",
      "hamilton", "east kilbride", "cumbernauld", "livingston", "dumfries", "kirkcaldy", "greenock",
      // England
      "london", "manchester", "birmingham", "liverpool", "bristol", "leeds", "york", "bath",
      "cambridge", "oxford", "newcastle", "sheffield", "nottingham", "leicester", "coventry",
      "brighton", "southampton", "portsmouth", "exeter", "norwich", "reading", "milton keynes",
      "sunderland", "middlesbrough", "derby", "wolverhampton", "stoke-on-trent", "stoke on trent",
      "peterborough", "blackpool", "bournemouth", "plymouth", "gloucester", "worcester",
      "cheltenham", "shrewsbury", "chester", "lancaster", "carlisle", "guildford", "windsor",
      "ipswich", "colchester", "luton", "watford", "st albans", "hertford", "harrogate",
      "wakefield", "huddersfield", "bradford", "barnsley", "rotherham", "doncaster",
      "hull", "kingston upon hull", "grimsby", "lincoln", "northampton", "bedford",
      "milton keynes", "slough", "basingstoke", "salisbury", "winchester", "chichester",
      "eastbourne", "hastings", "folkestone", "dover", "canterbury", "maidstone",
      "chatham", "rochester", "medway", "tunbridge wells", "guildford", "woking",
      "surrey", "croydon", "richmond", "kingston", "wimbledon",
      // Wales
      "cardiff", "swansea", "newport", "wrexham", "bangor", "aberystwyth", "llandudno",
      // Northern Ireland
      "belfast", "derry", "londonderry", "lisburn", "armagh", "newry",
    ],
  },
  {
    country: "Sweden",
    cities: [
      "stockholm", "gothenburg", "göteborg", "goteborg", "malmo", "malmö", "malmo",
      "uppsala", "vasteras", "västerås", "orebro", "örebro", "linkoping", "linköping",
      "helsingborg", "jonkoping", "jönköping", "norrkoping", "norrköping", "lund",
      "umea", "umeå", "gavle", "gävle", "boras", "borås", "sodertalje", "södertälje",
      "eskilstuna", "karlstad", "sundsvall", "halmstad", "växjö", "vaxjo",
    ],
  },
  {
    country: "Norway",
    cities: [
      "oslo", "bergen", "trondheim", "stavanger", "drammen", "fredrikstad",
      "kristiansand", "tromso", "tromsø", "sandnes", "sarpsborg", "skien",
      "ålesund", "alesund", "haugesund", "bodø", "bodo",
    ],
  },
  {
    country: "Denmark",
    cities: [
      "copenhagen", "kobenhavn", "københavn", "aarhus", "odense", "aalborg",
      "esbjerg", "randers", "kolding", "horsens", "vejle", "roskilde",
      "helsingør", "helsingor", "fredericia", "viborg", "silkeborg",
    ],
  },
  {
    country: "Finland",
    cities: [
      "helsinki", "espoo", "tampere", "vantaa", "oulu", "turku",
      "jyvaskyla", "jyväskylä", "lahti", "kuopio", "joensuu",
      "lappeenranta", "hämeenlinna", "hameenlinna", "rovaniemi",
    ],
  },
  {
    country: "Ireland",
    cities: [
      "dublin", "cork", "galway", "limerick", "waterford", "drogheda",
      "kilkenny", "wexford", "sligo", "athlone", "tralee", "killarney",
    ],
  },
  {
    country: "France",
    cities: [
      "paris", "lyon", "nice", "marseille", "toulouse", "bordeaux", "nantes",
      "strasbourg", "montpellier", "rennes", "lille", "toulon", "grenoble",
      "dijon", "nimes", "nîmes", "aix-en-provence", "reims", "angers",
      "clermont-ferrand", "brest", "le havre", "metz", "nancy", "amiens",
      "rouen", "caen", "tours", "limoges", "perpignan", "orléans", "orleans",
    ],
  },
  {
    country: "Germany",
    cities: [
      "berlin", "munich", "münchen", "munchen", "hamburg", "frankfurt",
      "cologne", "köln", "koln", "stuttgart", "dusseldorf", "düsseldorf",
      "dortmund", "essen", "bremen", "leipzig", "dresden", "hannover",
      "nuremberg", "nürnberg", "nurnberg", "duisburg", "bochum", "wuppertal",
      "bielefeld", "bonn", "münster", "munster", "karlsruhe", "mannheim",
      "augsburg", "wiesbaden", "gelsenkirchen", "heidelberg", "freiburg",
      "magdeburg", "kiel", "rostock", "erfurt", "mainz", "kassel",
      "saarbrücken", "saarbrucken", "potsdam", "halle", "braunschweig",
    ],
  },
  {
    country: "Spain",
    cities: [
      "madrid", "barcelona", "valencia", "seville", "sevilla", "zaragoza",
      "malaga", "málaga", "murcia", "palma", "las palmas", "bilbao",
      "alicante", "córdoba", "cordoba", "valladolid", "vigo", "gijon",
      "gijón", "granada", "san sebastian", "san sebastián", "toledo",
      "salamanca", "pamplona", "santander", "cadiz", "cádiz", "tarragona",
      "lleida", "almeria", "almería", "oviedo", "burgos",
    ],
  },
  {
    country: "Italy",
    cities: [
      "rome", "roma", "milan", "milano", "florence", "firenze", "venice",
      "venezia", "naples", "napoli", "turin", "torino", "genoa", "genova",
      "bologna", "bari", "catania", "palermo", "verona", "messina",
      "padua", "padova", "trieste", "brescia", "modena", "parma",
      "pisa", "siena", "perugia", "ancona", "cagliari",
    ],
  },
  {
    country: "Portugal",
    cities: [
      "lisbon", "lisboa", "porto", "braga", "coimbra", "funchal",
      "setubal", "setúbal", "aveiro", "faro", "evora", "évora",
      "viseu", "leiria", "viana do castelo", "guimarães", "guimaraes",
    ],
  },
  {
    country: "Netherlands",
    cities: [
      "amsterdam", "rotterdam", "the hague", "den haag", "utrecht",
      "eindhoven", "groningen", "tilburg", "almere", "breda", "nijmegen",
      "enschede", "apeldoorn", "haarlem", "arnhem", "amersfoort",
      "zaanstad", "haarlemmermeer", "s-hertogenbosch", "maastricht",
    ],
  },
  {
    country: "Belgium",
    cities: [
      "brussels", "brussel", "bruxelles", "bruges", "brugge", "ghent",
      "gent", "antwerp", "antwerpen", "liege", "liège", "namur",
      "leuven", "mechelen", "aalst", "hasselt", "mons", "charleroi",
    ],
  },
  {
    country: "Switzerland",
    cities: [
      "zurich", "zürich", "geneva", "genève", "geneve", "basel",
      "bern", "lausanne", "winterthur", "st. gallen", "lucerne",
      "luzern", "lugano", "biel", "bienne", "thun", "köniz", "koniz",
    ],
  },
  {
    country: "Austria",
    cities: [
      "vienna", "wien", "graz", "linz", "salzburg", "innsbruck",
      "klagenfurt", "villach", "wels", "st. pölten", "st polten",
      "dornbirn", "steyr", "wiener neustadt",
    ],
  },
  {
    country: "Poland",
    cities: [
      "warsaw", "warszawa", "krakow", "kraków", "lodz", "łódź",
      "wroclaw", "wrocław", "poznan", "poznań", "gdansk", "gdańsk",
      "szczecin", "katowice", "lublin", "bialystok", "białystok",
      "bydgoszcz", "torun", "toruń", "rzeszow", "rzeszów",
    ],
  },
  {
    country: "Czech Republic",
    cities: [
      "prague", "praha", "brno", "ostrava", "plzen", "plzeň",
      "liberec", "olomouc", "ceske budejovice", "české budějovice",
      "hradec kralove", "hradec králové", "pardubice", "usti nad labem",
    ],
  },
  {
    country: "United States",
    cities: [
      "new york", "los angeles", "chicago", "houston", "phoenix",
      "philadelphia", "san antonio", "san diego", "dallas", "san jose",
      "austin", "jacksonville", "fort worth", "columbus", "charlotte",
      "indianapolis", "san francisco", "seattle", "denver", "nashville",
      "oklahoma city", "el paso", "washington dc", "washington d.c.",
      "las vegas", "louisville", "memphis", "portland", "baltimore",
      "milwaukee", "albuquerque", "tucson", "fresno", "sacramento",
      "mesa", "kansas city", "atlanta", "omaha", "colorado springs",
      "raleigh", "miami", "boston", "minneapolis", "detroit",
      "new orleans", "cleveland", "pittsburgh", "orlando", "cincinnati",
      "tampa", "st. louis", "st louis", "salt lake city", "richmond",
      "buffalo", "madison", "hartford", "rochester", "new haven",
    ],
  },
  {
    country: "Canada",
    cities: [
      "toronto", "montreal", "montréal", "vancouver", "calgary",
      "edmonton", "ottawa", "winnipeg", "quebec city", "hamilton",
      "kitchener", "victoria", "halifax", "london ontario", "oshawa",
      "saskatoon", "regina", "st. john's", "kelowna", "abbotsford",
    ],
  },
  {
    country: "Australia",
    cities: [
      "sydney", "melbourne", "brisbane", "perth", "adelaide",
      "gold coast", "canberra", "sunshine coast", "wollongong",
      "geelong", "hobart", "townsville", "cairns", "darwin",
      "toowoomba", "ballarat", "bendigo", "albury", "launceston",
    ],
  },
  {
    country: "New Zealand",
    cities: [
      "auckland", "wellington", "christchurch", "hamilton", "tauranga",
      "napier", "hastings", "dunedin", "palmerston north", "nelson",
      "rotorua", "new plymouth", "whangarei", "invercargill",
    ],
  },
  {
    country: "Japan",
    cities: [
      "tokyo", "osaka", "kyoto", "yokohama", "nagoya", "sapporo",
      "fukuoka", "kobe", "hiroshima", "sendai", "kawasaki", "nara",
    ],
  },
  {
    country: "Singapore",
    cities: ["singapore"],
  },
  {
    country: "United Arab Emirates",
    cities: ["dubai", "abu dhabi", "sharjah", "ajman"],
  },
  {
    country: "South Africa",
    cities: [
      "cape town", "johannesburg", "durban", "pretoria", "port elizabeth",
      "bloemfontein", "east london", "nelspruit",
    ],
  },
];

// ISO 3166-1 alpha-2 codes → English country names.
// Used both for ccTLD hostname inference and Nominatim country_code resolution.
const ccTldCountryMap: Record<string, string> = {
  // British Isles / Europe
  uk: "United Kingdom", gb: "United Kingdom",
  ie: "Ireland",
  fr: "France",
  de: "Germany",
  es: "Spain",
  it: "Italy",
  pt: "Portugal",
  nl: "Netherlands",
  be: "Belgium",
  ch: "Switzerland",
  at: "Austria",
  se: "Sweden",
  no: "Norway",
  dk: "Denmark",
  fi: "Finland",
  pl: "Poland",
  cz: "Czech Republic",
  sk: "Slovakia",
  hu: "Hungary",
  ro: "Romania",
  bg: "Bulgaria",
  hr: "Croatia",
  si: "Slovenia",
  rs: "Serbia",
  ba: "Bosnia and Herzegovina",
  me: "Montenegro",
  mk: "North Macedonia",
  al: "Albania",
  gr: "Greece",
  cy: "Cyprus",
  mt: "Malta",
  lu: "Luxembourg",
  li: "Liechtenstein",
  mc: "Monaco",
  sm: "San Marino",
  va: "Vatican City",
  is: "Iceland",
  ee: "Estonia",
  lv: "Latvia",
  lt: "Lithuania",
  by: "Belarus",
  ua: "Ukraine",
  md: "Moldova",
  ru: "Russia",
  // Americas
  us: "United States",
  ca: "Canada",
  mx: "Mexico",
  br: "Brazil",
  ar: "Argentina",
  cl: "Chile",
  co: "Colombia",
  pe: "Peru",
  ve: "Venezuela",
  ec: "Ecuador",
  bo: "Bolivia",
  py: "Paraguay",
  uy: "Uruguay",
  gy: "Guyana",
  sr: "Suriname",
  gt: "Guatemala",
  bz: "Belize",
  hn: "Honduras",
  sv: "El Salvador",
  ni: "Nicaragua",
  cr: "Costa Rica",
  pa: "Panama",
  cu: "Cuba",
  do: "Dominican Republic",
  ht: "Haiti",
  jm: "Jamaica",
  tt: "Trinidad and Tobago",
  // Africa
  za: "South Africa",
  ng: "Nigeria",
  ke: "Kenya",
  gh: "Ghana",
  eg: "Egypt",
  et: "Ethiopia",
  tz: "Tanzania",
  ug: "Uganda",
  dz: "Algeria",
  ma: "Morocco",
  tn: "Tunisia",
  ly: "Libya",
  sd: "Sudan",
  ao: "Angola",
  mz: "Mozambique",
  zm: "Zambia",
  zw: "Zimbabwe",
  bw: "Botswana",
  na: "Namibia",
  sn: "Senegal",
  ci: "Côte d'Ivoire",
  cm: "Cameroon",
  rw: "Rwanda",
  mg: "Madagascar",
  // Asia-Pacific
  au: "Australia",
  nz: "New Zealand",
  jp: "Japan",
  cn: "China",
  hk: "Hong Kong",
  tw: "Taiwan",
  kr: "South Korea",
  kp: "North Korea",
  sg: "Singapore",
  my: "Malaysia",
  th: "Thailand",
  ph: "Philippines",
  id: "Indonesia",
  vn: "Vietnam",
  in: "India",
  pk: "Pakistan",
  bd: "Bangladesh",
  lk: "Sri Lanka",
  np: "Nepal",
  mm: "Myanmar",
  kh: "Cambodia",
  la: "Laos",
  // Middle East
  ae: "United Arab Emirates",
  sa: "Saudi Arabia",
  il: "Israel",
  jo: "Jordan",
  lb: "Lebanon",
  sy: "Syria",
  iq: "Iraq",
  ir: "Iran",
  kw: "Kuwait",
  qa: "Qatar",
  bh: "Bahrain",
  om: "Oman",
  ye: "Yemen",
  tr: "Turkey",
};

export function inferCountryFromSearch(location: string, hostname: string) {
  const fromLocation = inferCountryFromLocation(location);
  if (fromLocation) return fromLocation;
  return inferCountryFromHostname(hostname);
}

/**
 * Async country lookup for a location string.
 * Fast path: local alias + city table.
 * Fallback: Nominatim (OpenStreetMap) geocoding — works for any city worldwide.
 */
export async function lookupCountryForLocation(location: string): Promise<string | null> {
  const fast = inferCountryFromLocation(location);
  if (fast) return fast;

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", location);
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "1");

    const response = await fetch(url.toString(), {
      cache: "force-cache",
      headers: {
        "User-Agent": "StirlingLeadFinder/1.0 (lead-finder-app)",
        "Accept-Language": "en",
      },
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) return null;

    const results = (await response.json()) as Array<{
      address?: { country?: string; country_code?: string };
    }>;

    if (!results[0]?.address) return null;
    const { country_code, country } = results[0].address;
    // Prefer country_code → English name (locale-independent)
    if (country_code) return ccTldCountryMap[country_code.toLowerCase()] ?? country ?? null;
    return country ?? null;
  } catch {
    return null;
  }
}

export function inferCountryFromHostname(hostname: string) {
  const cleanedHostname = hostname.replace(/^www\./, "").toLowerCase();
  const parts = cleanedHostname.split(".");
  const lastPart = parts.at(-1);
  if (!lastPart) return null;
  if (lastPart === "uk") return "United Kingdom";
  return ccTldCountryMap[lastPart] ?? null;
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
    return '"official site" OR "hotel" -"compare prices" -"places to stay" -"best hotels" -"per night" -"book now" -"hotels in" -"where to stay"';
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

function looksLikeLocationListing(title: string, niche?: string) {
  const normalizedTitle = title.toLowerCase();
  const nicheKey = inferNicheKey(niche);

  if (nicheKey === "hotel" && /(hotels|places to stay|accommodation)\s+in\s+/i.test(normalizedTitle)) {
    return true;
  }

  if (nicheKey === "restaurant" && /(restaurants|places to eat)\s+in\s+/i.test(normalizedTitle)) {
    return true;
  }

  if (nicheKey === "venue" && /(venues|event spaces|wedding venues)\s+in\s+/i.test(normalizedTitle)) {
    return true;
  }

  if (nicheKey === "estate" && /(estate agents|letting agents|properties)\s+in\s+/i.test(normalizedTitle)) {
    return true;
  }

  return false;
}

function inferCountryFromLocation(location: string) {
  const normalizedLocation = location.toLowerCase();

  for (const alias of countryAliases) {
    if (alias.terms.some((term) => normalizedLocation.includes(term))) {
      return alias.country;
    }
  }

  for (const hint of cityCountryHints) {
    if (hint.cities.some((city) => normalizedLocation.includes(city))) {
      return hint.country;
    }
  }

  return null;
}
