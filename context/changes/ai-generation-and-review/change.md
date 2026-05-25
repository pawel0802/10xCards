---
change_id: ai-generation-and-review
title: AI flashcard generation and candidate review
status: implementing
created: 2026-05-25
updated: 2026-05-25
archived_at: null
---

## Notes

użytkownik może wkleić tekst i uzyskać kandydatki na fiszki od AI, a następnie zaakceptować, edytować lub odrzucić każdą z osobna; zaakceptowane fiszki trafiają natychmiast na listę.
- PRD refs: FR-002, FR-003, US-01
- Prerequisites: F-01
- Blockers: —
- Unknowns:
  - Który dostawca AI i model użyć do generowania fiszek? — Owner: user. Block: no.
  - Jak zapewnić widoczny postęp podczas generowania (NFR: ≤ 10s z ciągłym feedbackiem)? — Owner: team. Block: no.
- Risk: Jakość generowania AI to rdzeń produktu — zbyt niska acceptance rate (poniżej 75%) od razu podważa założenie, na którym zbudowany jest produkt; slice o najwyższym ryzyku produktowym w całym roadmapie.
- Status: proposed
