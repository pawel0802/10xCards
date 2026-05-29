# Spaced Repetition Libraries Research

## Summary

Several open-source JavaScript/TypeScript libraries implement spaced repetition (SR) algorithms and are compatible with the Astro + React + TypeScript stack. The most relevant and actively maintained options are `ts-fsrs` and `simple-ts-fsrs` (both FSRS algorithm), and the Obsidian Spaced Repetition plugin (which uses both FSRS and SM-2, and depends on `ts-fsrs`). The classic `spaced-repetition` repo implements SM-2 but is not actively maintained. All recommended libraries are browser-compatible and require no backend language other than JS/TS.

## Recommended Libraries

### 1. ts-fsrs
- NPM: https://www.npmjs.com/package/ts-fsrs
- Algorithm: FSRS (Free Spaced Repetition Scheduler)
- Status: Actively maintained
- Compatibility: Pure TypeScript, works in Node.js and browser, used in TS/React projects

### 2. simple-ts-fsrs
- JSR: https://jsr.io/@austinshelby/simple-ts-fsrs
- Algorithm: FSRS (minimal)
- Status: Maintained
- Compatibility: Pure TypeScript, works in Node.js, Deno, browser

### 3. Obsidian Spaced Repetition Plugin
- Repo: https://github.com/st3v3nmw/obsidian-spaced-repetition
- Algorithm: FSRS (via ts-fsrs), SM-2 (custom)
- Status: Actively maintained
- Compatibility: TypeScript, browser-compatible, real-world TS/React usage

### 4. spaced-repetition (joedel)
- Repo: https://github.com/joedel/spaced-repetition
- Algorithm: SM-2
- Status: Not actively maintained
- Compatibility: Node.js CLI, JavaScript

## Recommendation
Use `ts-fsrs` for robust, actively maintained FSRS scheduling. Use `simple-ts-fsrs` for a minimal implementation. For SM-2, adapt logic from the Obsidian plugin or the older `spaced-repetition` repo if needed.
