// Central design tokens for quick theming & future mobile (React Native) alignment.
// Strategy:
// 1. Keep semantic naming (e.g., metricBlue) while allowing future replacement by CSS vars.
// 2. Introduce a light/dark surface & text palette mapping—currently minimal but structured.
// 3. Provide guidance comments for adding new themes (e.g., highContrast) or platform overrides.
// 4. For React Native, map these semantic tokens to StyleSheet constants (mirror structure) without Tailwind classes.
// 5. Migration path: replace string Tailwind utility bundles with CSS variable references (e.g., 'text-[var(--color-metric-blue)]').

// Theme-neutral semantic color utility groupings (current Tailwind utility bundles)
export const colors = {
  accentGreen: 'bg-green-600 hover:bg-green-700',
  metricBlue: 'text-blue-600',
  metricOrange: 'text-orange-600',
  metricRed: 'text-red-600',
};

// Base palettes for future CSS-variable mapping.
// NOTE: Not yet wired to components directly; acts as a reference + future single source of truth.
export const palette = {
  light: {
    bg: '#ffffff',
    bgSubtle: '#f5f7fa',
    border: '#e2e8f0',
    text: '#111827',
    textSubtle: '#4b5563'
  },
  dark: {
    bg: '#0f1115',
    bgSubtle: '#1c2128',
    border: '#2d3748',
    text: '#f1f5f9',
    textSubtle: '#94a3b8'
  }
};

// Surfaces provide semantic layering (surface0 = page, surface1 = card, etc.)
export const surfaces = {
  light: {
    surface0: 'bg-white',
    surface1: 'bg-gray-50',
    surfaceElevated: 'bg-white shadow-sm'
  },
  dark: {
    surface0: 'bg-[#0f1115]',
    surface1: 'bg-[#1c2128]',
    surfaceElevated: 'bg-[#1c2128] shadow-sm'
  }
};

export const spacing = {
  pageX: 'px-2 sm:px-6',
  sectionY: 'py-4 sm:py-6',
};

export const radii = {
  card: 'rounded-lg',
  pill: 'rounded-full',
};

export const transitions = {
  base: 'transition-colors duration-150 ease-in-out',
};

export const layout = {
  metricMinWidth: '10.5rem',
  quickActionMinWidth: '8.5rem',
};

// Export shape intentionally flat for ease of import; maintain backward compatibility.
// When migrating to CSS vars: generate custom properties from palette + surfaces.
export const tokens = { colors, palette, surfaces, spacing, radii, transitions, layout };

export default tokens;
