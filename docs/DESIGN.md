# SerialSync UI (Figma)

**Source file:** [Figma — Clinical Care Hub](https://www.figma.com/design/vR4DaYPMmYq2EMyNGTOyx1/Untitled?node-id=4-4688)

Exported frames for the SRS report live in [design/figma/](./design/figma/). See [SRS_GUI_FIGURES.md](./SRS_GUI_FIGURES.md) for PDF figure replacement mapping.

| Token | Hex | Use |
|-------|-----|-----|
| Background | `#0F172A` | Page shell |
| Surface | `#1E293B` | Cards, panels |
| Surface elevated | `#334155` | Inputs, secondary buttons |
| Primary | `#38BDF8` | Main actions, active nav, token numbers |
| Secondary | `#10B981` | Success, live/active badges |
| Tertiary | `#F59E0B` | Warnings, priority |
| Muted text | `#94A3B8` | Labels, hints |

**Font:** Open Sans (see `frontend/src/app/layout.js`).

**Layout (Figma):**
- Patient top bar **1280×80**: logo + tagline, five text nav links, notifications bell, user name + city, avatar.
- Home hero: live sync strip, time-based greeting (full name), ID / blood type / SmartPass badges, optional **Your token** card.
- Mobile: bottom tab bar (Doctors, Bookings, Queue, Reports, Family).

**CSS helpers:** `frontend/src/app/globals.css` — `ss-page`, `ss-card`, `ss-btn-primary`, `ss-hero-panel`, `ss-token-card`, `ss-input`, `ss-link`.

**Layout:** Auth uses `AuthLayout` (marketing + form). App pages use `PatientShell` / `AppShell` with `max-w-[1280px]`.
