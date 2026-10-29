# SRS Chapter 5 — GUI figures (Figma revision)

The original SRS PDF (Fall 2026) embeds wireframe figures **5.6–5.12** as early placeholders. The **implemented and documented UI** follows the team Figma file:

[https://www.figma.com/design/vR4DaYPMmYq2EMyNGTOyx1/Untitled?node-id=4-4688](https://www.figma.com/design/vR4DaYPMmYq2EMyNGTOyx1/Untitled?node-id=4-4688)

Use this table when revising the PDF or citing figures in reports.

| SRS figure | Original caption | Figma / repo replacement |
|------------|------------------|---------------------------|
| 5.6 | Home & doctor multi-location search | `docs/design/figma/figma-home-dashboard.png` + live `/home` |
| 5.7 | Doctor schedule & serial booking | `/doctors/[id]/schedule`, `/bookings/[id]` |
| 5.8 | Patient live queue tracker | `/queue` + `docs/design/figma/figma-home-dashboard.png` (token card) |
| 5.9 | Queue assistant console | `/dashboard/assistant` |
| 5.10 | Doctor chamber itinerary | `/dashboard/schedule` |
| 5.11 | Home diagnostics & reports | `/diagnostics`, `/reports` |
| 5.12 | Admin moderation | `/dashboard/admin` |

**Navigation (Figma):** Find Doctors & Chambers · My Serial Bookings · Live Queue Hub · Diagnostic Reports · Family Care — implemented in `PatientShell.jsx` (desktop) and `BottomNav.jsx` (mobile).

**Branding:** SerialSync wordmark + **Clinical Care Hub** tagline (`BrandMark.jsx`).

To refresh PNGs after Figma changes:

1. Export **Shift+1** canvas screenshot → `docs/design/figma/figma-canvas-overview.png`
2. Export **Home & Doctor Search** (zoom to frame) → `docs/design/figma/figma-home-dashboard.png`
3. Crop seven **distinct** frames and rebuild the PDF:

```bash
python3 -m venv .venv-pdf && .venv-pdf/bin/pip install pymupdf pillow
.venv-pdf/bin/python scripts/crop_figma_overview.py
.venv-pdf/bin/python scripts/update_srs_pdf.py
```

The script updates **`SerialSync_Software_Requirements_Specification_SRS.pdf`** in the repo root (original backed up under `docs/SRS_backup/`).
