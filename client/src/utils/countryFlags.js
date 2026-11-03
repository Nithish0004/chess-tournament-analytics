import { countries } from 'countries-list';

/**
 * Convert 2-letter ISO 3166-1 alpha-2 code to emoji flag
 */
export const flagFromCode = (code) => {
  if (!code || typeof code !== 'string') return '';
  const clean = code.trim().toUpperCase();
  if (clean.length !== 2) return '';
  // Unicode regional indicator symbols: A -> 127462, Z -> 127487
  return String.fromCodePoint(...[...clean].map((c) => 127397 + c.charCodeAt(0)));
};

// Common aliases mapping to ISO alpha-2 codes
const COUNTRY_NAME_ALIASES = {
  'usa': 'US',
  'united states': 'US',
  'united states of america': 'US',
  'uk': 'GB',
  'united kingdom': 'GB',
  'england': 'GB',
  'scotland': 'GB',
  'wales': 'GB',
  'fide': '',
  'russia': 'RU',
  'south korea': 'KR',
  'north korea': 'KP',
  'vietnam': 'VN',
  'iran': 'IR',
  'syria': 'SY',
  'czech republic': 'CZ',
  'czechia': 'CZ'
};

// Full list of ISO 3166-1 countries, sorted alphabetically
export const ALL_COUNTRIES = Object.entries(countries)
  .map(([code, data]) => ({
    code,
    name: data.name,
    native: data.native || data.name,
    flag: flagFromCode(code)
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

// Fast lookup map by lowercase code and lowercase name
const countryMapByCode = new Map();
const countryMapByName = new Map();

for (const item of ALL_COUNTRIES) {
  countryMapByCode.set(item.code.toLowerCase(), item);
  countryMapByName.set(item.name.toLowerCase(), item);
}

/**
 * Get country object { code, name, flag } by either code or name
 */
export const getCountryData = (codeOrName) => {
  if (!codeOrName || typeof codeOrName !== 'string') return null;
  const query = codeOrName.trim().toLowerCase();

  // Try direct code match (e.g. "in", "us")
  if (countryMapByCode.has(query)) {
    return countryMapByCode.get(query);
  }

  // Try alias
  if (COUNTRY_NAME_ALIASES[query]) {
    const aliasCode = COUNTRY_NAME_ALIASES[query].toLowerCase();
    if (countryMapByCode.has(aliasCode)) {
      return countryMapByCode.get(aliasCode);
    }
  }

  // Try direct name match (e.g. "india", "united states")
  if (countryMapByName.has(query)) {
    return countryMapByName.get(query);
  }

  // Substring / partial match fallback
  const found = ALL_COUNTRIES.find((c) => c.name.toLowerCase().includes(query));
  return found || null;
};

/**
 * Backwards-compatible flag retriever for existing views & profiles.
 * Accepts country name or ISO-2 code (e.g. "India", "IN", "Norway", "NO").
 */
export const getCountryFlag = (countryOrCode) => {
  if (!countryOrCode) return null;
  const match = getCountryData(countryOrCode);
  if (match) return match.flag;

  // If 2 uppercase ASCII letters, render directly
  if (typeof countryOrCode === 'string' && /^[A-Za-z]{2}$/.test(countryOrCode.trim())) {
    return flagFromCode(countryOrCode);
  }
  return null;
};

export const getCountryName = (countryOrCode) => {
  if (!countryOrCode) return '';
  const match = getCountryData(countryOrCode);
  if (match) return match.name;
  return countryOrCode;
};
