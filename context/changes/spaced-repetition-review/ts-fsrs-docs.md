# ts-fsrs Documentation Snapshot (2026-05-28)

## Overview

ts-fsrs is a TypeScript package for building spaced repetition systems using the FSRS algorithm. It is actively maintained and compatible with modern JS/TS stacks (Astro, React, Node.js, browser).

## Installation

```
npm install ts-fsrs
yarn add ts-fsrs
pnpm install ts-fsrs
bun add ts-fsrs
```

## Quickstart

```ts
import { createEmptyCard, fsrs, Rating } from 'ts-fsrs'
const scheduler = fsrs()
const card = createEmptyCard()
const preview = scheduler.repeat(card, new Date())
console.log(preview[Rating.Good].card)
const result = scheduler.next(card, new Date(), Rating.Good)
console.log(result.card)
console.log(result.log)
```

## Custom Parameters

```ts
const scheduler = fsrs({
  request_retention: 0.9,
  maximum_interval: 36500,
  enable_fuzz: true,
  enable_short_term: true,
  learning_steps: ['1m', '10m'],
  relearning_steps: ['10m'],
})
```

## Advanced Usage
- Use `generatorParameters()` for serialization/persistence.
- Use `repeat()` to preview all outcomes, `next()` to apply a rating.
- Calculate retrievability: `scheduler.get_retrievability(card, date, false)`
- Use helpers: `rollback(card, log)`, `forget(card, now)`, `reschedule(card, reviews)`

## Reference
- Card states: `State.New`, `State.Learning`, `State.Review`, `State.Relearning`
- Ratings: `Rating.Again`, `Rating.Hard`, `Rating.Good`, `Rating.Easy`

## Links
- [README](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/README.md)
- [API Docs](https://open-spaced-repetition.github.io/ts-fsrs/)
- [Browser Example](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/example/example.html)
- [Full-stack Demo](https://github.com/ishiko732/ts-fsrs-demo)

---

This is a snapshot. For the latest, always check the official links above.
