// contrast text color (black/white)
export function getContrastTextColor(hexColor: string): string {
  const cleanHex = (hexColor || 'cccccc').replace(/^#/, '');
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;

  // YIQ luminance formula
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 135 ? '#090d16' : '#ffffff';
}

// ensure '#' prefix
export function formatHexColor(color: string): string {
  if (!color) return '#64748b';
  return color.startsWith('#') ? color : `#${color}`;
}
