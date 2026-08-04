# Deck Content Lab

## Design POV
A slide deck is a compiled artifact, not a document you edit directly. The narrative is the source of truth. It has to hold together as structured data before any layout exists.

## What It Is
An AI-orchestrated presentation builder. Pick a storytelling framework, STAR, SOAR, PREP, BLUF, or AIDA, fill five narrative beats through guided AI chat, run two critics against the draft, preview it through different audience lenses, then compile to themed, semantic HTML slides.

## What It Does
- Extracts structured briefs from URLs, notes, and screenshots (confidence-tagged: high / inferred / gap)
- Maps content onto 5-beat storytelling frameworks, swappable without losing content
- Runs a "murder board": a Skeptic critic and a Storyteller critic against every draft, scored 0–100
- Simulates PM / exec / recruiter / peer audience lenses on the same content, read-only
- Compiles the finished narrative into style-agnostic semantic HTML across 32 themes

## The Problem
"Story before slides" isn't a new pitch. Tome built a company on it before shutting its presentation product down in 2025, and STORYD, Chronicle, and Storyflow all do versions of it today. The real gap is narrower: every one of them starts from a blank prompt. None of them take the pile of documents you already have and find the story that's already buried in there. That's what this is for.

## STAR

**Situation.** Every AI presentation tool on the market gives you tools to build a deck. What none of them do is help you find the story already sitting across the dozen documents, decks, and threads you've already written. I kept hitting this myself. The material for a good case study was always there, just never assembled.

**Task.** Build something that treats the narrative as the product, not the slides. Force a story to hold together as structured data before any layout exists, and make the pipeline do the synthesis work I was doing by hand.

**Action.** Started with a deterministic template filler in May 2026, no AI, just scaffolding. Replaced it piece by piece with an actual subagent pipeline: extraction, framework mapping, two critics running a murder board on every draft, multi-lens audience simulation, then a slide compiler that turns the finished narrative into theme-agnostic HTML. Hardened it for real use along the way (CORS, rate limiting, Zod validation at every route, a serverless-safe extraction fallback) because a tool that only works on a laptop isn't a tool.

**Result.** A user can go from blank notes to an exportable, scored, critiqued narrative in under 10 minutes. Still a lab, not a finished product. Currently mid-rebuild toward a 16-agent pipeline that adds real cross-document synthesis, which is the part of the original problem I still haven't fully solved.

(STAR is also literally one of the five frameworks the tool itself outputs. This write-up is the joke on itself.)

## Links
- Live app: https://deck-content-lab.vercel.app
- Source: https://github.com/abhisxn/deck-content-lab

## Structure
This experiment doesn't run inline. It's a full standalone Next.js 15 app on its own Vercel deployment. `index.tsx` here is a launcher card with links out to the live app and the repo, not an embed of the app itself.
