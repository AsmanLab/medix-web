# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Medix
**Generated:** 2026-07-23
**Category:** Healthcare B2B marketplace (medical equipment, Kyrgyzstan)

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#0891B2` | `--color-primary` / `--primary` |
| Soft primary | soft cyan wash | `--primary-soft` |
| CTA / success | `#059669` | `--color-cta` / `--cta` |
| Background | cool white cyan tint | `--background` |
| Text | `#164E63`-ish | `--foreground` |

**Color Notes:** Calm cyan + health green. No purple/pink AI gradients. No neon.

### Typography

- **Heading Font:** Figtree (`--font-display`)
- **Body Font:** Noto Sans (`--font-sans`)
- **Body size:** 16px minimum
- **Mood:** medical, clean, accessible, professional, trustworthy

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `--spacing-section` | `2.5rem` | Between home sections |
| `--spacing-section-lg` | `3.5rem` | Major section breaks |
| Touch targets | ≥ 44×44px | Nav, buttons, mobile tabs |

### Effects

- Soft shadows (`--shadow-soft`, `--shadow-card`) — no multi-layer glow
- Focus rings 3px on `--ring`
- Respect `prefers-reduced-motion`
- Transition 150–300ms on interactive hover

---

## Style Guidelines

**Style:** Accessible & Ethical + calm medical B2B

**Key Effects:** Clear focus rings, ARIA labels, skip-friendly structure, responsive, reduced motion

### Storefront pattern

1. Hero / banner
2. Categories
3. Featured products
4. Trust
5. Secondary CTA (contacts / service)

### Admin pattern

- Dense but calm: white surfaces, soft cyan accents
- Sticky sidebar, clear logout
- One primary action per toolbar

---

## Anti-Patterns (Do NOT Use)

- Bright neon colors
- Motion-heavy animations
- AI purple/pink gradients
- Emojis as icons (use Lucide)
- Invisible focus states
- Cards in hero for decoration only

---

## Waves (implementation)

- **D1** — tokens in `src/styles.css`, fonts in `index.html`, shell spacing
- **D2** — home / catalog / PDP media + rhythm
- **D3** — AdminShell surface polish

See also `AUDIT.md`.
