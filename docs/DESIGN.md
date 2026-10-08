# SerialSync UI (Figma)

All sprint work should use these tokens so later screens stay consistent.

| Token | Hex | Use |
|-------|-----|-----|
| Background | `#0F172A` | Page shell |
| Surface | `#1E293B` | Cards, panels |
| Surface elevated | `#334155` | Inputs, secondary buttons |
| Primary | `#38BDF8` | Main actions, active nav |
| Secondary | `#10B981` | Success, live/active badges |
| Tertiary | `#F59E0B` | Warnings, priority |
| Muted text | `#94A3B8` | Labels, hints |

**Font:** Open Sans (see `frontend/src/app/layout.js`).

**CSS helpers:** `frontend/src/app/globals.css` — classes `ss-page`, `ss-card`, `ss-btn-primary`, `ss-btn-secondary`, `ss-input`, `ss-link`.

**Layout:** Auth uses a single column on small screens; from `lg` up, marketing + trust sit left and the form sits in a card on the right (`AuthLayout`). App pages use `AppShell` with `max-w-6xl`.

Future sprints (queue, booking, admin) should reuse these classes before adding one-off colors.
