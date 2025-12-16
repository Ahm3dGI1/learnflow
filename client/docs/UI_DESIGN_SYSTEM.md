# LearnFlow UI Design System

> A comprehensive guide to maintain visual consistency across the LearnFlow application

**Last Updated:** December 16, 2025  
**Version:** 1.0.0

---

## Table of Contents

1. [Color Palette](#color-palette)
2. [Typography](#typography)
3. [Spacing System](#spacing-system)
4. [Components](#components)
5. [Glassmorphism Effects](#glassmorphism-effects)
6. [Animations & Transitions](#animations--transitions)
7. [Shadows & Depth](#shadows--depth)
8. [Accessibility Guidelines](#accessibility-guidelines)
9. [Best Practices](#best-practices)

---

## Color Palette

### Primary Colors - Sky Blue Theme

LearnFlow uses a **sky blue** color scheme for consistency across all UI elements.

```css
/* Primary Sky Blue Colors */
--primary: #0ea5e9;           /* sky-500 - Main brand color */
--primary-light: #38bdf8;     /* sky-400 - Lighter accent */
--primary-dark: #0284c7;      /* sky-600 - Darker accent */
--primary-darker: #0369a1;    /* sky-700 - Deep blue */
```

#### Usage Examples:
- **Buttons (Primary):** `#0ea5e9` → `#0284c7` gradient
- **Hover States:** `#0284c7`
- **Active/Focus:** `#0369a1`
- **Links:** `#0ea5e9`
- **Progress Bars:** `#0ea5e9` → `#38bdf8` gradient

### Secondary Colors

```css
/* Success/Correct Answers */
--success: #10b981;           /* emerald-500 */
--success-bg: rgba(16, 185, 129, 0.1);
--success-light: #34d399;     /* emerald-400 */

/* Error/Incorrect Answers */
--error: #ef4444;             /* red-500 */
--error-bg: rgba(239, 68, 68, 0.1);

/* Warning */
--warning: #f59e0b;           /* amber-500 */
--warning-bg: rgba(245, 158, 11, 0.1);

/* Info */
--info: #3b82f6;              /* blue-500 */
```

### Neutral Colors

```css
/* Text Colors */
--text-primary: #0c4a6e;      /* Deep blue-gray for headings */
--text-secondary: #475569;    /* Slate-600 for body text */
--text-muted: #64748b;        /* Slate-500 for secondary text */
--text-disabled: #94a3b8;     /* Slate-400 */

/* Background Colors */
--bg-primary: #ffffff;
--bg-secondary: #f8fafc;      /* slate-50 */
--bg-tertiary: #f1f5f9;       /* slate-100 */
```

### Background Gradients

```css
/* Page Backgrounds */
background: linear-gradient(
  135deg, 
  #e0f2fe 0%,    /* sky-100 */
  #bae6fd 30%,   /* sky-200 */
  #7dd3fc 60%,   /* sky-300 */
  #38bdf8 100%   /* sky-400 */
);
background-attachment: fixed;
```

### ⚠️ **DEPRECATED COLORS - DO NOT USE**

```css
/* ❌ OLD PURPLE THEME - REMOVED */
#667eea  /* old-primary - replaced with #0ea5e9 */
#764ba2  /* old-secondary - replaced with #0284c7 */
#9333ea  /* old-purple - replaced with #0369a1 */
#a855f7  /* old-purple-light - DO NOT USE */
#e0e7ff  /* old-purple-bg - replaced with #e0f2fe */
#f3e8ff  /* old-purple-bg-light - replaced with #bae6fd */
```

---

## Typography

### Font Family

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
             'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
             'Helvetica Neue', sans-serif;
```

### Font Sizes

```css
/* Headings */
--text-3xl: 1.875rem;  /* 30px - Page titles */
--text-2xl: 1.5rem;    /* 24px - Section titles */
--text-xl: 1.25rem;    /* 20px - Card titles */
--text-lg: 1.125rem;   /* 18px - Subtitles */

/* Body */
--text-base: 1rem;     /* 16px - Body text */
--text-sm: 0.875rem;   /* 14px - Secondary text */
--text-xs: 0.75rem;    /* 12px - Labels, badges */
```

### Font Weights

```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Line Heights

```css
--leading-tight: 1.25;   /* Headings */
--leading-normal: 1.5;   /* Body text */
--leading-relaxed: 1.75; /* Comfortable reading */
```

---

## Spacing System

Use a consistent 8px-based spacing system:

```css
/* Spacing Scale */
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-5: 1.25rem;  /* 20px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-10: 2.5rem;  /* 40px */
--space-12: 3rem;    /* 48px */
--space-16: 4rem;    /* 64px */
```

### Padding Guidelines

```css
/* Cards */
padding: 1.5rem;           /* Mobile */
padding: 2rem;             /* Desktop */

/* Buttons */
padding: 0.75rem 1.5rem;   /* Standard */
padding: 0.875rem 1.75rem; /* Large */
padding: 0.5rem 1rem;      /* Small */

/* Page Containers */
padding: 1rem;             /* Mobile */
padding: 2rem;             /* Desktop */
```

### Gap/Grid Spacing

```css
gap: 1rem;    /* Standard grid gap */
gap: 1.5rem;  /* Comfortable spacing */
gap: 0.5rem;  /* Tight spacing */
```

---

## Components

### Buttons

#### Primary Button

```css
.button-primary {
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  color: white;
  border: none;
  padding: 0.875rem 1.75rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(14, 165, 233, 0.3);
}

.button-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(14, 165, 233, 0.4);
}

.button-primary:active {
  transform: translateY(0);
}

.button-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
```

#### Secondary Button

```css
.button-secondary {
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: var(--text-primary);
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.button-secondary:hover {
  background: rgba(255, 255, 255, 0.4);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.15);
}
```

### Cards

#### Glass Card (Standard)

```css
.card-glass {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 1rem;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.35);
  box-shadow: 0 4px 24px rgba(14, 165, 233, 0.08);
  transition: all 0.3s ease;
}

.card-glass:hover {
  box-shadow: 0 8px 32px rgba(14, 165, 233, 0.12);
  transform: translateY(-2px);
}
```

#### Elevated Card

```css
.card-elevated {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.card-elevated:hover {
  border-color: #0284c7;
  box-shadow: 0 4px 12px rgba(56, 178, 172, 0.15);
}
```

### Input Fields

```css
.input-field {
  width: 100%;
  padding: 0.875rem 1.25rem;
  font-size: 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 0.75rem;
  background: white;
  color: var(--text-primary);
  transition: all 0.2s ease;
}

.input-field:focus {
  outline: none;
  border-color: #0ea5e9;
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
}

.input-field::placeholder {
  color: var(--text-muted);
}
```

### Progress Bars

```css
.progress-bar-container {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #0ea5e9, #38bdf8);
  border-radius: 3px;
  transition: width 0.3s ease;
}
```

### Badges

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 600;
}

.badge-primary {
  background: rgba(14, 165, 233, 0.1);
  color: #0284c7;
  border: 1px solid #0ea5e9;
}

.badge-success {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1px solid #10b981;
}
```

---

## Glassmorphism Effects

### CSS Variables

```css
:root {
  --glass-bg: rgba(255, 255, 255, 0.25);
  --glass-border: rgba(255, 255, 255, 0.35);
  --glass-card-bg: rgba(255, 255, 255, 0.85);
}
```

### Standard Glass Effect

```css
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  box-shadow: 0 4px 24px rgba(14, 165, 233, 0.08);
}
```

### Glass Card (Higher Opacity)

```css
.glass-card {
  background: var(--glass-card-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  box-shadow: 
    0 8px 32px rgba(14, 165, 233, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
```

### Background Decorations

```css
.page-decoration::before {
  content: '';
  position: fixed;
  width: 500px;
  height: 500px;
  background: radial-gradient(
    circle, 
    rgba(6, 182, 212, 0.2) 0%, 
    transparent 70%
  );
  top: -150px;
  right: -100px;
  filter: blur(80px);
  pointer-events: none;
  z-index: 0;
}
```

---

## Animations & Transitions

### Standard Transitions

```css
/* Default transition for interactive elements */
transition: all 0.3s ease;

/* Faster transitions for small movements */
transition: all 0.2s ease;

/* Smoother transitions for complex animations */
transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
```

### Hover Effects

```css
/* Lift on hover */
.lift-on-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(14, 165, 233, 0.15);
}

/* Scale on hover */
.scale-on-hover:hover {
  transform: scale(1.05);
}

/* Slide on hover */
.slide-on-hover:hover {
  transform: translateX(2px);
}
```

### Keyframe Animations

```css
/* Fade In Up */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Slide Up */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Pulse */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Spin (for loading) */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
```

### Usage

```css
.animate-fade-in {
  animation: fadeInUp 0.5s ease-out;
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-spin {
  animation: spin 1s linear infinite;
}
```

---

## Shadows & Depth

### Shadow Scale

```css
/* Subtle elevation */
--shadow-sm: 0 2px 8px rgba(14, 165, 233, 0.05);

/* Standard cards */
--shadow-md: 0 4px 24px rgba(14, 165, 233, 0.08);

/* Elevated elements */
--shadow-lg: 0 8px 32px rgba(14, 165, 233, 0.12);

/* Popups and modals */
--shadow-xl: 0 10px 40px rgba(0, 0, 0, 0.15);

/* Deep shadows */
--shadow-2xl: 0 20px 40px rgba(0, 0, 0, 0.2);
```

### Button Shadows

```css
/* Primary button shadow */
box-shadow: 0 4px 16px rgba(14, 165, 233, 0.3);

/* Hover state */
box-shadow: 0 8px 24px rgba(14, 165, 233, 0.4);
```

---

## Accessibility Guidelines

### Color Contrast

- **Text on light backgrounds:** Ensure minimum 4.5:1 contrast ratio
- **Large text (18px+):** Minimum 3:1 contrast ratio
- **Interactive elements:** Clear visual distinction from non-interactive elements

### Focus States

```css
.focusable:focus-visible {
  outline: 2px solid #0ea5e9;
  outline-offset: 2px;
}

/* Alternative for buttons */
.button:focus-visible {
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.3);
}
```

### ARIA Labels

Always include descriptive aria-labels for interactive elements:

```jsx
<button 
  className="flashcards-button"
  aria-label="Generate and study flashcards"
>
  <Brain size={18} />
  Flashcards
</button>
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
  
  /* Simplified alternatives */
  .fade-in {
    opacity: 1;
  }
}
```

### High Contrast Mode

```css
@media (prefers-contrast: high) {
  .card {
    background: white;
    border: 2px solid #000;
  }
  
  .button-primary {
    border: 2px solid #000;
  }
}
```

---

## Best Practices

### 1. Consistent Component Structure

Always follow this structure for new components:

```css
/* Component base styles */
.component-name {
  /* Layout properties */
  display: flex;
  flex-direction: column;
  
  /* Sizing */
  width: 100%;
  padding: 1.5rem;
  
  /* Visual styles */
  background: var(--glass-card-bg);
  backdrop-filter: blur(20px);
  border-radius: 1rem;
  border: 1px solid var(--glass-border);
  
  /* Effects */
  box-shadow: var(--shadow-md);
  transition: all 0.3s ease;
}

/* States */
.component-name:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.component-name:active {
  transform: translateY(0);
}

.component-name:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

### 2. Naming Conventions

- **Use BEM methodology:** `.block__element--modifier`
- **Descriptive names:** `.flashcard-deck` not `.fd`
- **State classes:** `.is-active`, `.is-loading`, `.is-disabled`
- **Utility classes:** `.text-center`, `.mt-4`, `.flex`

### 3. Responsive Design

```css
/* Mobile first approach */
.component {
  padding: 1rem;
  font-size: 1rem;
}

/* Tablet */
@media (min-width: 768px) {
  .component {
    padding: 1.5rem;
    font-size: 1.125rem;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .component {
    padding: 2rem;
    font-size: 1.25rem;
  }
}
```

### 4. Component Checklist

Before finalizing a component, ensure:

- [ ] Uses sky blue color palette (`#0ea5e9`, `#0284c7`)
- [ ] No purple colors (`#667eea`, `#764ba2`, etc.)
- [ ] Includes hover states with proper transitions
- [ ] Has focus-visible styles for keyboard navigation
- [ ] Implements glassmorphism effects consistently
- [ ] Uses standardized spacing (8px system)
- [ ] Includes responsive breakpoints
- [ ] Handles disabled states
- [ ] Has appropriate ARIA labels
- [ ] Supports reduced motion preference
- [ ] Meets WCAG 2.1 AA contrast standards

### 5. Color Usage Guide

| Element Type | Color | Hex |
|-------------|-------|-----|
| Primary Buttons | Sky Blue Gradient | `#0ea5e9` → `#0284c7` |
| Links | Sky Blue | `#0ea5e9` |
| Hover States | Dark Sky Blue | `#0284c7` |
| Success Messages | Emerald | `#10b981` |
| Error Messages | Red | `#ef4444` |
| Text (Headings) | Deep Blue | `#0c4a6e` |
| Text (Body) | Slate | `#475569` |
| Text (Muted) | Light Slate | `#64748b` |
| Borders | White with opacity | `rgba(255, 255, 255, 0.35)` |
| Card Backgrounds | White with opacity | `rgba(255, 255, 255, 0.85)` |

### 6. Common Patterns

#### Loading States

```jsx
{loading && (
  <div className="loading-content">
    <div className="animate-spin">
      <RefreshCw size={48} />
    </div>
    <h2>Loading...</h2>
    <p>Please wait</p>
  </div>
)}
```

#### Error States

```jsx
{error && (
  <div className="error-content">
    <AlertCircle size={48} color="#ef4444" />
    <h2>Error</h2>
    <p>{error}</p>
    <button onClick={retry}>Try Again</button>
  </div>
)}
```

#### Empty States

```jsx
{items.length === 0 && (
  <div className="empty-state">
    <InboxIcon size={64} />
    <h3>No items yet</h3>
    <p>Get started by adding your first item</p>
    <button onClick={create}>Create New</button>
  </div>
)}
```

---

## Quick Reference

### CSS Variables Template

Copy this to the top of your CSS files:

```css
:root {
  /* Sky Blue Theme */
  --primary: #0ea5e9;
  --primary-light: #38bdf8;
  --primary-dark: #0284c7;
  --primary-darker: #0369a1;
  
  /* Glass Effects */
  --glass-bg: rgba(255, 255, 255, 0.25);
  --glass-border: rgba(255, 255, 255, 0.35);
  --glass-card-bg: rgba(255, 255, 255, 0.85);
  
  /* Text */
  --text-primary: #0c4a6e;
  --text-secondary: #475569;
  --text-muted: #64748b;
  
  /* Semantic Colors */
  --success: #10b981;
  --error: #ef4444;
  --warning: #f59e0b;
}
```

---

## Resources

- **Color Tool:** [Tailwind CSS Colors](https://tailwindcss.com/docs/customizing-colors)
- **Contrast Checker:** [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Glassmorphism Generator:** [Glassmorphism CSS Generator](https://ui.glass/generator/)

---

## Maintenance

This design system should be updated when:
- New color patterns are introduced
- Component patterns change significantly
- Accessibility requirements evolve
- Team feedback identifies inconsistencies

**Questions?** Contact the design team or open an issue in the repository.

---

**Version History:**
- v1.0.0 (Dec 16, 2025) - Initial design system documentation
