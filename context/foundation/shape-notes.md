---
project: "10xCards"
context_type: greenfield
product_type: web-app
target_scale:
  users: medium
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 3
  hard_deadline: "2026-06-20"
  after_hours_only: true
created: 2026-05-19
updated: 2026-05-19
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: "primary persona"
      decision: "self-taught professional learning new domain knowledge, individually, across many domains"
    - topic: "pain category"
      decision: "workflow friction — manual flashcard creation is possible but too slow"
    - topic: "persona scope"
      decision: "individuals learning on their own, across many domains"
  frs_drafted: 6
  quality_check_status: accepted
---

## Vision & Problem Statement

A self-taught professional who wants to learn new domain knowledge using spaced repetition hits the same wall every time: turning raw study material into flashcards is entirely manual work. The friction is not philosophical — they know spaced repetition works — it is operational. Pasting a block of text into Anki and hand-writing a card per concept takes long enough that they skip the flashcard step entirely and default to passive re-reading, which is less effective.

The insight: existing tools treat flashcard creation as a user's job. No tool has delivered AI generation from raw pasted text at a quality bar high enough to actually replace the manual step. 10xCards is built on the premise that if AI can draft ≥ 75% of cards the user would have written anyway, the workflow friction disappears and spaced repetition becomes the default, not the exception.

## User & Persona

**Primary persona:** Self-taught professional.

- **Role:** Individual learner, not inside a specific institution or organization.
- **Context:** Learning new domain knowledge independently — technical skills, frameworks, business concepts, languages — across many topics over time.
- **Moment they reach for this product:** They have a block of text — an article, documentation page, set of notes — and want to study it using spaced repetition. The flashcard creation step is the blocker.
- **What they do today:** Manually write cards in Anki or skip flashcards altogether and re-read passively.

## Access Control

Login required — email + password or OAuth. Flat user model: every authenticated user has the same access level. There are no admin or guest roles in MVP.

- Unauthenticated users cannot view or manage any flashcards.
- Each user's flashcard sets are private to their account.
- Sign-up and sign-in are standard flows; no invite or waitlist gate.

## Success Criteria

### Primary

- The end-to-end flow works: user signs up → pastes text → AI generates flashcard candidates → user reviews/edits/accepts cards → user completes a spaced repetition review session.
- ≥ 75% of AI-generated cards are accepted by the user without edits (quality bar for AI generation).

### Secondary

- ≥ 75% of all flashcards created by users originate from AI generation (not manual entry).

### Guardrails

- No data loss: accepted flashcards persist reliably across sessions.
- User data privacy: flashcard content and personal data are not exposed to other users or third parties beyond what the AI generation call requires.

## Functional Requirements

- FR-001: User can register and log in. Priority: must-have

  > Socrates: Counter-argument considered: "auth adds friction that kills early user acquisition — anonymous use first would be better." Resolution: kept; auth is needed on day one to prevent data loss when users accumulate cards across sessions.

- FR-002: User can paste raw text and trigger AI flashcard generation. Priority: must-have

  > Socrates: Counter-argument considered: "AI quality may be inconsistent — bad output trains users to distrust and abandon the AI flow." Resolution: kept; this is the core risk to manage through the review step (FR-003) and the 75% acceptance-rate success criterion.

- FR-003: User can review AI-generated card candidates — accept, edit, or discard each. Priority: must-have

  > Socrates: Counter-argument considered: "review step adds friction — bulk-accept-all would be faster." Resolution: kept; the review step is how users build trust in AI output quality, which is load-bearing for the 75% acceptance target.

- FR-004: User can manually create a flashcard. Priority: must-have

  > Socrates: Counter-argument considered: "manual creation dilutes the AI value proposition." Resolution: kept; manual creation is a safety net for cards AI missed or got wrong, not a competing flow.

- FR-005: User can view, edit, and delete their flashcards. Priority: must-have

  > Socrates: Counter-argument considered: "edit/delete post-acceptance adds scope — just accept/discard at review time is enough for MVP." Resolution: kept; post-acceptance editing is essential for long-term card quality maintenance.

- FR-006: User can start and complete a spaced repetition review session. Priority: must-have
  > Socrates: Counter-argument considered: "SR integration is the hardest piece — a simple random review would ship faster." Resolution: kept; SR is the whole point — without it the product is a flashcard creator, not a learning tool.

## User Stories

### US-01: User generates flashcards from pasted text

- **Given** a logged-in user with raw study text
- **When** they paste the text and trigger generation
- **Then** they see a set of AI-generated flashcard candidates they can accept, edit, or discard

#### Acceptance Criteria

- AI returns at least one card candidate for any non-trivial text input
- Each candidate is individually accept/edit/discard-able before being saved
- Accepted cards are immediately available in the user's card list

## Business Logic

The app makes two distinct domain decisions for the user:

**Rule 1 — AI generation:** Given a block of raw text, the app determines which concepts are worth learning and phrases them as effective question/answer flashcard pairs. Inputs: user-pasted text. Output: a ranked set of flashcard candidates. The user encounters this rule in the generation review step, where they accept, edit, or discard each candidate.

**Rule 2 — Spaced repetition scheduling:** Given the user's recall performance on each card (correct / incorrect / difficulty rating per review), the app determines when to surface each card again. This rule is delegated to an existing spaced repetition algorithm (not built from scratch). Inputs: review outcomes per card. Output: the next scheduled review date per card. The user encounters this rule as the order and timing of cards in a review session.

## Non-Functional Requirements

- AI flashcard generation completes within 10 seconds for typical text input, with visible progress feedback during generation.
- The app is usable on the latest two major versions of Chrome, Firefox, Safari, and Edge (mainstream desktop browsers).
- User data — flashcard content and review history — is not accessible to other users or third parties beyond the AI generation call.

## Non-Goals

- **No custom spaced repetition algorithm.** An existing SR algorithm (library or implementation) will be integrated. Building a proprietary algorithm (SuperMemo, Anki-style) is out of scope — it would consume the entire MVP timeline with no user-visible payoff.
- **No file import (PDF, DOCX, etc.).** Text input is paste-only for MVP. File parsing adds significant surface area and is not needed to validate the core AI generation loop.
- **No shared flashcard sets.** All cards are private to the creating user's account. Sharing and collaboration features are explicitly deferred.
- **No integrations with other learning platforms.** No Anki export, LMS connectors, or third-party platform integrations in MVP.
- **No mobile apps.** Web only for MVP. Native mobile (iOS/Android) is an explicit non-goal at this stage.
