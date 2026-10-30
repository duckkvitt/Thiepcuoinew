const fontIds = new Set([
  'georgia',
  'cormorant-garamond',
  'playfair-display',
  'libre-baskerville',
  'lora',
  'dancing-script',
  'montserrat',
  'be-vietnam-pro'
]);

export const typographyDefaults = {
  entry: { headingFont: 'cormorant-garamond', bodyFont: 'cormorant-garamond', headingSize: 42, bodySize: 14, headingWeight: 500, headingItalic: false },
  hero: { headingFont: 'cormorant-garamond', bodyFont: 'georgia', headingSize: 64, bodySize: 14, headingWeight: 500, headingItalic: false },
  invitation: { headingFont: 'georgia', bodyFont: 'georgia', headingSize: 27, bodySize: 13, headingWeight: 600, headingItalic: false },
  gallery: { headingFont: 'georgia', bodyFont: 'be-vietnam-pro', headingSize: 27, bodySize: 13, headingWeight: 600, headingItalic: false },
  reception: { headingFont: 'georgia', bodyFont: 'georgia', headingSize: 27, bodySize: 13, headingWeight: 600, headingItalic: false },
  venue: { headingFont: 'georgia', bodyFont: 'be-vietnam-pro', headingSize: 27, bodySize: 13, headingWeight: 600, headingItalic: false },
  timeline: { headingFont: 'georgia', bodyFont: 'georgia', headingSize: 27, bodySize: 13, headingWeight: 600, headingItalic: false },
  guestbook: { headingFont: 'georgia', bodyFont: 'georgia', headingSize: 27, bodySize: 13, headingWeight: 600, headingItalic: false },
  gift: { headingFont: 'georgia', bodyFont: 'georgia', headingSize: 27, bodySize: 13, headingWeight: 600, headingItalic: false }
};

const invitationPartDefaults = {
  families: { font: 'georgia', size: 13, weight: 600, italic: false },
  announcement: { font: 'georgia', size: 13, weight: 400, italic: false },
  names: { font: 'cormorant-garamond', size: 52, weight: 500, italic: false },
  roles: { font: 'be-vietnam-pro', size: 10, weight: 400, italic: false },
  venue: { font: 'georgia', size: 13, weight: 600, italic: false },
  date: { font: 'georgia', size: 13, weight: 600, italic: false }
};

const clampNumber = (value, fallback, min, max) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : fallback;
};

export const normalizeTypographySettings = (value) => {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return Object.fromEntries(Object.entries(typographyDefaults).map(([section, defaults]) => {
    const current = source[section] && typeof source[section] === 'object' ? source[section] : {};
    const normalized = {
      headingFont: fontIds.has(current.headingFont) ? current.headingFont : defaults.headingFont,
      bodyFont: fontIds.has(current.bodyFont) ? current.bodyFont : defaults.bodyFont,
      headingSize: clampNumber(current.headingSize, defaults.headingSize, 18, 80),
      bodySize: clampNumber(current.bodySize, defaults.bodySize, 10, 22),
      headingWeight: [400, 500, 600, 700].includes(Number(current.headingWeight)) ? Number(current.headingWeight) : defaults.headingWeight,
      headingItalic: current.headingItalic === true
    };
    if (section === 'invitation') {
      const partSource = current.parts && typeof current.parts === 'object' ? current.parts : {};
      normalized.parts = Object.fromEntries(Object.entries(invitationPartDefaults).map(([part, partDefaults]) => {
        const partCurrent = partSource[part] && typeof partSource[part] === 'object' ? partSource[part] : {};
        return [part, {
          font: fontIds.has(partCurrent.font) ? partCurrent.font : partDefaults.font,
          size: clampNumber(partCurrent.size, partDefaults.size, 8, 80),
          weight: [400, 500, 600, 700].includes(Number(partCurrent.weight)) ? Number(partCurrent.weight) : partDefaults.weight,
          italic: partCurrent.italic === true
        }];
      }));
    }
    return [section, normalized];
  }));
};
