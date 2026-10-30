// Country to emoji flag mapping with globe fallback
export const COUNTRY_FLAGS = {
  'Norway': '🇳🇴',
  'USA': '🇺🇸',
  'United States': '🇺🇸',
  'US': '🇺🇸',
  'India': '🇮🇳',
  'Uzbekistan': '🇺🇿',
  'France': '🇫🇷',
  'China': '🇨🇳',
  'Germany': '🇩🇪',
  'Netherlands': '🇳🇱',
  'Spain': '🇪🇸',
  'Poland': '🇵🇱',
  'Sweden': '🇸🇪',
  'Armenia': '🇦🇲',
  'Japan': '🇯🇵',
  'Brazil': '🇧🇷',
  'Cuba': '🇨🇺',
  'Russia': '🇷🇺',
  'FIDE': '🌐',
  'England': '🇬🇧',
  'United Kingdom': '🇬🇧',
  'UK': '🇬🇧',
  'Canada': '🇨🇦',
  'Italy': '🇮🇹',
  'Azerbaijan': '🇦🇿',
  'Hungary': '🇭🇺',
  'Ukraine': '🇺🇦',
  'Romania': '🇷🇴',
  'Vietnam': '🇻🇳',
  'Iran': '🇮🇷',
  'Argentina': '🇦🇷',
  'Australia': '🇦🇺',
  'Turkey': '🇹🇷',
  'Georgia': '🇬🇪',
  'Israel': '🇮🇱',
  'Czech Republic': '🇨🇿'
};

export const getCountryFlag = (country) => {
  if (!country) return null;
  const trimmed = country.trim();
  return COUNTRY_FLAGS[trimmed] || null;
};
