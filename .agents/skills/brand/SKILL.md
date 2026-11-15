---
name: brand
description: Use this skill for any user interface (UI) work in the Pilates MVP project. Follow its typography, color, surface, accessibility, calendar, avoidance, and tone guidelines.
---

# Brand

## Visual identity

The Pilates MVP uses an elegant, minimalist visual identity inspired by the classic Gratz Pilates reformer in Regimental Blue.

**Reference image:**
`assets/brand/Gratz_catalogue_REGIMENTALBLUE_2022_copy_5000x.webp`

The design should communicate calm, precision, professionalism, quality, and simplicity.

Use the photograph as a visual reference for the color palette and aesthetic direction.

Do not use the Gratz logo as the application's identity or imply any commercial association with Gratz.

## Fonts

Use fonts that work reliably offline.

- **Headings and body:** System sans-serif (`system-ui`, `Arial`, `sans-serif`).
- **Accent (optional):** A locally bundled serif font or `Georgia`, used sparingly.
- **Code, numbers and identifiers:** System monospace (`ui-monospace`, `monospace`).

Prefer clear, readable typography over decorative fonts.

Do not load Google Fonts or other external font resources at runtime.

## Colors

The color scheme is inspired by the Regimental Blue reformer.

These colors are approximate visual references derived from the supplied photograph, not official Gratz brand specifications.

| Role | Color | Hex | Usage |
|---|---|---|---|
| Primary | Regimental Blue | `#426282` | Navigation, primary buttons, selected elements |
| Primary Dark | Deep Blue | `#295178` | Headings, emphasis, active states |
| Secondary | Muted Blue | `#5C7998` | Secondary controls and supporting elements |
| Background | Warm White | `#F5F1F0` | Main application background |
| Surface | White | `#FFFFFF` | Cards, forms and calendar panels |
| Ink | Graphite | `#252525` | Main text |
| Border | Soft Grey | `#D7D9DB` | Input borders, dividers and subtle outlines |

### Color usage

- Use Regimental Blue as the dominant brand color.
- Use warm white and white for most interface surfaces.
- Use Graphite for primary text.
- Use Deep Blue for selected states and important headings.
- Use Muted Blue for secondary interface elements.
- Avoid large areas of saturated color.
- Maintain sufficient contrast between text and backgrounds.

### Functional status colors

Use semantic colors when they improve operational clarity.

- **Available:** muted green, accompanied by a label or icon.
- **Full:** neutral grey, accompanied by a clear "Completa" label.
- **Absence:** muted amber, accompanied by an "Ausencia" label.
- **Recovery booked:** blue, accompanied by a "Recuperación" label.
- **Error or destructive action:** accessible red, accompanied by an explanatory message.

Never communicate a status through color alone.

## Surfaces

### Light mode

- Page background: `#F5F1F0`.
- Cards and panels: `#FFFFFF`.
- Main text: `#252525`.
- Primary interactive elements: `#426282`.
- Subtle dividers and borders: `#D7D9DB`.

Use softly rounded cards, consistent spacing and restrained shadows.

The interface should feel clean, calm and professional.

### Dark mode

Dark mode is not required for the MVP.

If implemented later, define a complete accessible dark palette rather than automatically inverting the light colors.

## Calendar and class management

The calendar is the main operational interface of the application.

The UI must support a single administrator managing students, classes, absences and recovery bookings.

### Calendar

- Prioritize a mobile-friendly daily and weekly calendar.
- Display class time, group, level, modality and available capacity.
- Make available spaces immediately visible.
- Clearly distinguish scheduled classes, absences and recovery bookings.
- Provide an easy way to navigate between dates.
- Keep the interface usable on a vertical Android smartphone screen.

### Students

- Display the student's name prominently.
- Use the student's phone number as secondary contact information.
- The student's name is the unique business identifier.
- Do not introduce student authentication or login screens.

### Absences and recoveries

- Provide clear actions for registering an absence and booking a recovery.
- Display compatible sessions and available spaces.
- Clearly communicate the recovery deadline.
- Show confirmation before irreversible operations.
- Make the current booking status visible.

### Capacity

- Display occupied and available spaces numerically.
- Clearly identify fully booked sessions.
- Never rely only on colors to communicate availability.
- Use consistent labels and status indicators throughout the application.

## Mobile-first design


- Optimize layouts for portrait orientation.
- Prefer single-column layouts on narrow screens.
- Use large, comfortable touch targets, preferably at least 44 × 44 CSS pixels.
- Keep primary actions visible and easy to reach.
- Avoid unnecessary navigation levels.
- Use concise forms and clear field labels.
- Minimize typing and repetitive administrative work.
- Keep navigation consistent across screens.


## Technical compatibility

The visual design must follow the architecture and development stages defined in `docs/TECH_STACK.md`.

- Support the React, Vite and TypeScript frontend used in the course.
- Support administrator authentication when introduced during the Supabase Auth stage.
- Use responsive, mobile-first layouts without requiring PWA installation or offline operation.
- Preserve the Regimental Blue visual identity.
- Support the dark-mode exercise introduced in the course.
- Do not introduce technical restrictions that conflict with the course architecture.
- Keep students as business records, not application users.

## Accessibility

- Aim for WCAG AA contrast requirements.
- Use readable font sizes and adequate line spacing.
- Provide visible focus indicators.
- Use sufficiently large interactive elements.
- Do not rely exclusively on color to indicate status.
- Make error messages specific and understandable.
- Maintain readable layouts on smaller Android screens.

## Avoid

- Avoid the bright Sea Green, Marigold and Coral palette inherited from Accountable.
- Avoid excessive gradients and saturated backgrounds.
- Avoid unnecessary decorative elements.
- Avoid borders on only one edge of panels or single-line borders at the top of a page.
- Avoid overly complex dashboards.
- Avoid dense desktop-oriented tables on mobile screens.
- Avoid small buttons and crowded touch targets.
- Avoid decorative animations that interfere with usability.
- Avoid visual elements that imply an official relationship with Gratz Pilates.

## Tone

Use plain, professional Spanish for all user-facing text.

- Short, clear labels.
- No unnecessary jargon.
- No exclamation marks.
- Prefer operational clarity over marketing language.
- Use consistent terminology for alumnos, grupos, clases, ausencias, plazas and recuperaciones.
- Make confirmations and error messages specific and actionable.
- Avoid generic AI-generated marketing phrases.

The overall experience should feel calm, precise, practical and trustworthy.