import { useMemo } from 'react';

interface ColorValidation {
  hex: string;
  isValid: boolean;
  normalized: string;
  contrast: number;
  needsAdjustment: boolean;
}

export const useBrandingValidation = () => {
  const normalizeHex = (color: string): string => {
    if (!color) return '';
    
    // Remove # if present
    let hex = color.replace('#', '');
    
    // Convert short form to long form (#RGB -> #RRGGBB)
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
    
    // Remove alpha channel if present
    if (hex.length === 8) {
      hex = hex.substring(0, 6);
    }
    
    return hex.length === 6 && /^[0-9A-Fa-f]{6}$/.test(hex) ? `#${hex.toUpperCase()}` : '';
  };

  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const normalized = normalizeHex(hex);
    if (!normalized) return null;
    
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalized);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const getLuminance = (r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map(val => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const getContrastRatio = (color1: string, color2: string): number => {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    
    if (!rgb1 || !rgb2) return 0;
    
    const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
    
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  };

  const adjustColorForContrast = (color: string, background: string, minContrast: number = 4.5): string => {
    let adjusted = normalizeHex(color);
    if (!adjusted) return color;
    
    let rgb = hexToRgb(adjusted);
    if (!rgb) return color;
    
    let currentContrast = getContrastRatio(adjusted, background);
    let iterations = 0;
    const maxIterations = 20;
    
    // Determine if we need to lighten or darken
    const bgRgb = hexToRgb(background);
    if (!bgRgb) return adjusted;
    
    const bgLum = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
    const shouldDarken = bgLum > 0.5;
    
    while (currentContrast < minContrast && iterations < maxIterations) {
      const factor = shouldDarken ? 0.9 : 1.1;
      rgb.r = Math.max(0, Math.min(255, Math.round(rgb.r * factor)));
      rgb.g = Math.max(0, Math.min(255, Math.round(rgb.g * factor)));
      rgb.b = Math.max(0, Math.min(255, Math.round(rgb.b * factor)));
      
      adjusted = `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`.toUpperCase();
      currentContrast = getContrastRatio(adjusted, background);
      iterations++;
    }
    
    return adjusted;
  };

  const validateColor = (color: string, backgroundColor: string = '#FFFFFF'): ColorValidation => {
    const normalized = normalizeHex(color);
    const isValid = !!normalized;
    const contrast = isValid ? getContrastRatio(normalized, backgroundColor) : 0;
    const needsAdjustment = contrast > 0 && contrast < 4.5;

    return {
      hex: color,
      isValid,
      normalized: normalized || color,
      contrast,
      needsAdjustment
    };
  };

  return {
    normalizeHex,
    validateColor,
    getContrastRatio,
    adjustColorForContrast,
    hexToRgb,
    getLuminance
  };
};
