# SVG Colour Control – Successful Approach

This document outlines the **successful approach** used in this project to control the colours of SVG logos and icons at runtime (e.g. tenant theme primary/secondary). It is the single reference for applying theme-driven fill to SVGs on the web app.

---

## 1. Problem

We need SVG assets (brand logo, nav icons) to use **theme colours** (e.g. tenant primary/secondary) so they match the rest of the UI. Approaches that **did not work** reliably in this stack:

- **`currentColor` + wrapper `color`**: React Native Web’s `View` does not support the `color` style, so `currentColor` never resolves.
- **`replaceAttrValues: { '#000000': 'currentColor' }`** plus a wrapper with `style={{ color }}`: same issue; the wrapper is often a View.
- **`replaceAttrValues: { '#000000': '{props.fill}' }`**: dynamic prop replacement in the SVGR/webpack pipeline did not reliably apply at runtime (icons stayed black).
- **`fill={color}` on the root `<svg>`** and `inherit` on paths: the root svg did not receive the fill in a way that paths could inherit consistently.

So we **do not rely** on `currentColor`, `inherit`, or passing `fill` into the SVG component for theme colour. We drive fill via **CSS variables** and a **global override** instead.

---

## 2. Solution: CSS Variable + Global Override

The approach that **works** in this project:

1. **Global CSS** (in `apps/web/index.html`): define a class that forces every `path` inside it to use a **CSS variable** for `fill`, with `!important` so it overrides any inline or SVGR-generated fill.
2. **Web only**: wrap the SVG in a **native DOM element** (a `div`, not a React Native `View`) that has that class and sets the CSS variable in its `style` (e.g. `--pcp-nav-icon-fill: #1976d2`).
3. **Distinct class and variable per use case** (e.g. nav icons vs brand logo) so different parts of the app do not interfere.

No reliance on `currentColor` or `inherit` in the DOM tree; the variable is set on the wrapper and the global rule applies it to all `path` elements inside.

---

## 3. Implementation

### 3.1 Global CSS (`apps/web/index.html`)

Add one rule per use case. Each rule:

- Targets a **class** on the wrapper (e.g. `.pcp-nav-icon-fill`, `.pcp-brand-logo-fill`).
- Sets `path { fill: var(--variable-name) !important; }` so every `path` inside uses the variable.

Example:

```html
<style>
  /* Nav icons: force fill from theme via CSS variable (currentColor inheritance unreliable with RN Web) */
  .pcp-nav-icon-fill path { fill: var(--pcp-nav-icon-fill) !important; }
  /* Brand logo: path fill from theme (same approach as nav icons; requires vector SVG, not embedded image) */
  .pcp-brand-logo-fill path { fill: var(--pcp-brand-logo-fill) !important; }
</style>
```

Use a **unique class and variable name** for each use case so nav icons and logo (and any future SVG groups) stay independent.

### 3.2 Webpack / SVGR

The generic SVG rule in `apps/web/webpack.config.js` uses **@svgr/webpack** with:

```js
replaceAttrValues: { '#000000': 'currentColor' }
```

This is optional for the colour-control approach: the global CSS rule overrides path fill at runtime, so the SVG can keep `#000000` or `currentColor` in source; the variable + `!important` wins. Keeping `replaceAttrValues` is fine and does not conflict.

### 3.3 Wrapper in the component (web only)

Where the SVG is rendered (e.g. `NavIcon`, `BrandLogo`):

1. **Detect web**: use `typeof document !== 'undefined'` (or your app’s equivalent).
2. **On web**, when a theme/colour is to be applied:
   - Render the SVG inside a **native DOM div** created with `React.createElement('div', ...)`.
   - Set on that div:
     - **className**: the same class used in the global CSS (e.g. `pcp-nav-icon-fill` or `pcp-brand-logo-fill`).
     - **style**: the CSS variable (e.g. `'--pcp-nav-icon-fill': iconColor`) plus layout (width, height, flex to centre the icon).
3. **Do not** pass `fill` or `color` into the SVG component for this theme colour; the global rule applies the variable to all `path` elements inside the wrapper.

Example pattern (conceptually):

```tsx
if (typeof document !== 'undefined' && iconColor != null) {
  return createElement(
    'div',
    {
      className: 'pcp-nav-icon-fill',
      style: {
        '--pcp-nav-icon-fill': iconColor,
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
    },
    <SvgComponent width={...} height={...} />
  );
}
return ( /* React Native or non-themed fallback */ );
```

### 3.4 Where colours come from

- **Theme**: use `useTheme()` and pass e.g. `theme.colors.primary` or `theme.colors.secondary` into the component that sets the CSS variable.
- **Fallback**: when theme is not ready, use a default (e.g. `theme.colors?.primary ?? '#1976d2'`) so the SVG is never invisible.

---

## 4. Reference: Where It’s Used

| Use case      | CSS class / variable           | File that sets the variable        | Global rule in        |
|---------------|--------------------------------|-------------------------------------|------------------------|
| Nav bar icons | `.pcp-nav-icon-fill`, `--pcp-nav-icon-fill`   | `apps/web/src/components/NavIcon.tsx`   | `apps/web/index.html`  |
| Brand logo    | `.pcp-brand-logo-fill`, `--pcp-brand-logo-fill` | `apps/web/src/components/BrandLogo.tsx` | `apps/web/index.html`  |

- **NavIcon**: wrapper div with `pcp-nav-icon-fill` and `--pcp-nav-icon-fill: var(--color-text)` so nav icons (Play, Stats) follow light/dark theme. Used in `AuthenticatedLayout` with `opp-play.svg` and `opp-stats.svg`.
- **BrandLogo**: optional `fillColor` prop; when set, wrapper div with `pcp-brand-logo-fill` and `--pcp-brand-logo-fill: fillColor`. Consumers pass e.g. `fillColor={theme.colors?.primary ?? '#2571b8'}`.

---

## 5. Adding a New Theme-Coloured SVG Group

To control colour for another set of SVGs (e.g. a new icon set):

1. **Add a global rule** in `apps/web/index.html`:
   - New class, e.g. `.pcp-my-icon-fill`.
   - New variable, e.g. `--pcp-my-icon-fill`.
   - Rule: `.pcp-my-icon-fill path { fill: var(--pcp-my-icon-fill) !important; }`.
2. **In the component** that renders the SVG on web:
   - Wrap the SVG in a native `div` with `className: 'pcp-my-icon-fill'` and `style={{ '--pcp-my-icon-fill': myColor, ... }}`.
   - Use `createElement('div', ...)` when on web (`typeof document !== 'undefined'`) and when a colour is provided.
3. **Do not** reuse the same class/variable as nav icons or brand logo, so each use case stays independent.

---

## 6. Summary

| What                         | Where / how |
|-----------------------------|-------------|
| Global rule                 | `apps/web/index.html`: `.pcp-*-fill path { fill: var(--pcp-*-fill) !important; }` |
| Wrapper                     | Native DOM `div` with that class and `style={{ '--pcp-*-fill': color }}` (web only) |
| Web detection               | `typeof document !== 'undefined'` |
| Theme colour                | From `useTheme()`; pass into component that sets the variable; use fallback hex if theme not ready |
| No reliance on              | `currentColor`, `inherit`, or passing `fill` to the SVG for theme colour |

This pattern works consistently for SVG logos and icons in the web app and avoids the limitations of `currentColor` and View-based wrappers in React Native Web.
