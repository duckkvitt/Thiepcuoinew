export const FONT_OPTIONS = [
  { id: 'georgia', label: 'Georgia cổ điển', stack: "Georgia, 'Times New Roman', serif" },
  { id: 'cormorant-garamond', label: 'Cormorant Garamond', stack: "'Cormorant Garamond', Georgia, serif" },
  { id: 'playfair-display', label: 'Playfair Display', stack: "'Playfair Display', Georgia, serif" },
  { id: 'libre-baskerville', label: 'Libre Baskerville', stack: "'Libre Baskerville', Georgia, serif" },
  { id: 'lora', label: 'Lora thanh lịch', stack: "Lora, Georgia, serif" },
  { id: 'dancing-script', label: 'Dancing Script viết tay', stack: "'Dancing Script', cursive" },
  { id: 'montserrat', label: 'Montserrat hiện đại', stack: "Montserrat, Arial, sans-serif" },
  { id: 'be-vietnam-pro', label: 'Be Vietnam Pro', stack: "'Be Vietnam Pro', Arial, sans-serif" }
];

export const TYPOGRAPHY_SECTIONS = [
  { id: 'entry', label: 'Màn mở thiệp', preview: 'hero' },
  { id: 'hero', label: 'Bìa thiệp', preview: 'hero' },
  { id: 'invitation', label: 'Thông tin lễ cưới', preview: 'invitation' },
  { id: 'gallery', label: 'Album ảnh', preview: 'gallery' },
  { id: 'reception', label: 'Thông tin tiệc cưới', preview: 'reception' },
  { id: 'venue', label: 'Địa điểm', preview: 'venue' },
  { id: 'timeline', label: 'Lịch trình ngày cưới', preview: 'timeline' },
  { id: 'guestbook', label: 'Sổ lưu bút', preview: 'guestbook' },
  { id: 'gift', label: 'Lì xì mừng cưới', preview: 'gift' }
];

export const TYPOGRAPHY_DEFAULTS = {
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

export const INVITATION_PARTS = [
  { id: 'families', label: 'Thông tin hai gia đình', sample: 'Ông Bà · Phạm Văn Thắng · Bùi Thị Mai' },
  { id: 'announcement', label: 'Lời báo tin', sample: 'Lễ thành hôn của chúng tôi' },
  { id: 'names', label: 'Tên cô dâu chú rể', sample: 'Tiến Anh & Hải Yến' },
  { id: 'roles', label: 'Vai trò cô dâu chú rể', sample: 'TRƯỞNG NAM · ÚT NỮ' },
  { id: 'venue', label: 'Nơi cử hành', sample: 'Lễ thành hôn được cử hành tại tư gia' },
  { id: 'date', label: 'Ngày giờ cưới', sample: '09:00 · Thứ Bảy · 05 tháng 01, 2026' }
];

export const INVITATION_PART_DEFAULTS = {
  families: { font: 'georgia', size: 13, weight: 600, italic: false },
  announcement: { font: 'georgia', size: 13, weight: 400, italic: false },
  names: { font: 'cormorant-garamond', size: 52, weight: 500, italic: false },
  roles: { font: 'be-vietnam-pro', size: 10, weight: 400, italic: false },
  venue: { font: 'georgia', size: 13, weight: 600, italic: false },
  date: { font: 'georgia', size: 13, weight: 600, italic: false }
};

const fontMap = Object.fromEntries(FONT_OPTIONS.map((font) => [font.id, font]));
const clamp = (value, fallback, min, max) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : fallback;
};

export function normalizeTypography(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return Object.fromEntries(Object.entries(TYPOGRAPHY_DEFAULTS).map(([section, defaults]) => {
    const current = source[section] && typeof source[section] === 'object' ? source[section] : {};
    const normalized = {
      headingFont: fontMap[current.headingFont] ? current.headingFont : defaults.headingFont,
      bodyFont: fontMap[current.bodyFont] ? current.bodyFont : defaults.bodyFont,
      headingSize: clamp(current.headingSize, defaults.headingSize, 18, 80),
      bodySize: clamp(current.bodySize, defaults.bodySize, 10, 22),
      headingWeight: [400, 500, 600, 700].includes(Number(current.headingWeight)) ? Number(current.headingWeight) : defaults.headingWeight,
      headingItalic: current.headingItalic === true
    };
    if (section === 'invitation') {
      const partSource = current.parts && typeof current.parts === 'object' ? current.parts : {};
      normalized.parts = Object.fromEntries(Object.entries(INVITATION_PART_DEFAULTS).map(([part, partDefaults]) => {
        const partCurrent = partSource[part] && typeof partSource[part] === 'object' ? partSource[part] : {};
        return [part, {
          font: fontMap[partCurrent.font] ? partCurrent.font : partDefaults.font,
          size: clamp(partCurrent.size, partDefaults.size, 8, 80),
          weight: [400, 500, 600, 700].includes(Number(partCurrent.weight)) ? Number(partCurrent.weight) : partDefaults.weight,
          italic: partCurrent.italic === true
        }];
      }));
    }
    return [section, normalized];
  }));
}

export function typographyStyle(value, section) {
  const settings = normalizeTypography(value)[section] || TYPOGRAPHY_DEFAULTS[section];
  const style = {
    '--custom-heading-font': fontMap[settings.headingFont].stack,
    '--custom-body-font': fontMap[settings.bodyFont].stack,
    '--custom-heading-size': `${settings.headingSize}px`,
    '--custom-body-size': `${settings.bodySize}px`,
    '--custom-heading-weight': settings.headingWeight,
    '--custom-heading-style': settings.headingItalic ? 'italic' : 'normal'
  };
  if (section === 'invitation') {
    Object.entries(settings.parts).forEach(([part, partSettings]) => {
      style[`--invitation-${part}-font`] = fontMap[partSettings.font].stack;
      style[`--invitation-${part}-size`] = `${partSettings.size}px`;
      style[`--invitation-${part}-weight`] = partSettings.weight;
      style[`--invitation-${part}-style`] = partSettings.italic ? 'italic' : 'normal';
    });
  }
  return style;
}
