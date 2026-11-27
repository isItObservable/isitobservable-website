// Single source of truth for the rebrand's content taxonomy (ISI-7948, spec ISI-7919 §2).
//
// Each category maps to its locked neon "tile" color (ISI-7918 Concept C, locked in ISI-7916 v3.3).
// The color is referenced by CSS custom-property NAME, so the hex value stays single-sourced in
// src/styles/global.css (the `--cat-*` tokens) and is never duplicated here. Components read the
// color from this module via `categoryColor()`; they never hard-code it. The Zod `category` field
// in src/content.config.ts is built from `categoryIds`, so unknown categories fail the build.

export const taxonomy = {
  k8s: { label: 'Kubernetes', colorVar: '--cat-k8s' },
  otel: { label: 'OpenTelemetry', colorVar: '--cat-otel' },
  cloudnative: { label: 'CloudNative News', colorVar: '--cat-cloudnative' },
  otelnews: { label: 'OTel News', colorVar: '--cat-otelnews' },
  security: { label: 'Security', colorVar: '--cat-security' },
} as const;

export type CategoryId = keyof typeof taxonomy;

// Tuple of ids for z.enum() in the content schema (non-empty, so the type satisfies Zod).
export const categoryIds = Object.keys(taxonomy) as [CategoryId, ...CategoryId[]];

// The CSS color reference for a category, e.g. categoryColor('k8s') === 'var(--cat-k8s)'.
// Use in component styles so the neon value stays authoritative in global.css.
export const categoryColor = (id: CategoryId): string => `var(${taxonomy[id].colorVar})`;

// The human-readable label for a category tile/tag.
export const categoryLabel = (id: CategoryId): string => taxonomy[id].label;
