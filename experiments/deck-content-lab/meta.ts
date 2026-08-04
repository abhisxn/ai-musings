import { ExperimentMeta } from '@/lib/types'

const meta: ExperimentMeta = {
  slug: 'deck-content-lab',
  title: 'Deck Content Lab',
  description: 'A narrative-first AI presentation builder. Story locked before a single slide exists.',
  summary: 'AI-orchestrated presentation builder that forces a story to hold together as structured data before any layout exists.',
  date: '2026-08-04',
  type: 'react',
  status: 'live',
  tags: ['ai', 'narrative', 'nextjs', 'llm-pipeline', 'product'],
  series: undefined,
  thumbnail: '/experiments/deck-content-lab/thumbnail.svg',
  hero: '/experiments/deck-content-lab/hero.svg',
  caseStudy: {
    about: [
      {
        text: "Deck Content Lab is a narrative engineering tool, not a slide generator. Pick a storytelling framework - STAR, SOAR, PREP, BLUF, AIDA - and it forces five narrative beats to hold together as data before a single slide exists. Slides get compiled from that structure at the end. They're not where the work happens.",
      },
      {
        text: "It's built on Next.js 15 with a growing pipeline of AI subagents, 14 right now, 16 in progress, all routed through one OpenRouter client, all validated with Zod, all streaming back to the UI over SSE. Two critics run a 'murder board' on every draft before it ships. A multi-lens panel previews the same narrative through a PM's eyes, an exec's eyes, a recruiter's eyes, without touching a word of the underlying content.",
      },
    ],
    exploring: [
      {
        text: "'Story before slides' isn't a new idea. Tome built a whole company on it before shutting down its presentation product in 2025, and STORYD, Chronicle, and Storyflow are all doing versions of it today. So the honest gap isn't 'nobody does narrative-first.' It's narrower than that. Every one of those tools still starts from a blank prompt. You type a topic, they write you a story. None of them take the hundred pages you already have (specs, transcripts, old decks, a pile of Slack threads) and go find the story that's already buried in there.",
      },
      {
        text: "That's the gap I built this for, originally just for myself. I kept hitting the same wall: the material for a good case study or pitch already existed somewhere, scattered across docs and URLs and screenshots, and turning it into one coherent argument was still entirely on me. The first commit, in May 2026, was a deterministic, no-AI generator, barely more than a template filler. It only became a real pipeline once I started routing that scattered material through actual extraction and synthesis agents instead of summarizing it by hand every time.",
      },
    ],
    learnings: [
      {
        lead: 'Scoring next to generation looked simpler. It made everything slower.',
        text: "Beat scoring used to run inside the same request that built the narrative, which meant the hub sat on a loading screen for an extra 3–10 seconds waiting on a score nobody had asked to see yet. I split it into its own SSE event (scores-ready) and a narrow reducer action that only patches the score fields. The hub renders the moment the narrative is ready, and scores fill in behind it without clobbering whatever the user's already started editing.",
      },
      {
        lead: 'Repeating a security check across 11 routes means eventually missing one.',
        text: "CORS and rate limiting could have lived in each API route. I put them in one Edge Middleware file instead, scoped to /api/:path*, one place to get right instead of eleven places to get wrong. It also runs before the route handler with near-zero cold start, which a Node middleware setup wouldn't give me.",
      },
      {
        lead: "Readability can't see through a JavaScript-rendered page, and it fails quietly.",
        text: "Pasting a Notion page or a Linear ticket used to come back nearly empty. Readability just can't parse content that only exists after JS runs. Now anything under 200 characters triggers Jina Reader as a serverless-safe fallback before falling back further to a local Playwright instance, which can't run on Vercel at all but is fine for local dev.",
      },
      {
        lead: "A try/catch around a stream doesn't tell the user anything went wrong.",
        text: "When an SSE stream failed mid-flight - a subagent erroring out, a fetch aborting - the UI just quietly reset to the entry screen. No message, no clue why. The fix wasn't more error-handling logic. It was one thing: an explicit error event in the stream contract, and a visible banner on the client that actually says what broke.",
      },
      {
        lead: "TypeScript's types are a promise the library doesn't have to keep.",
        text: "Readability's parse() is typed to always return something, and for most pages it does, until it hits a page it genuinely can't parse and returns null. The code that assumed article.title would always exist threw instead of degrading. Optional chaining fixed the crash. Trusting the type instead of the runtime is what caused it.",
      },
    ],
    innerWorkings: [
      {
        lead: 'Intake → brief.',
        text: "Paste a URL, notes, or a screenshot, and contentExtractor (plus visionArchitect for images) turns it into a structured brief: technical details, user flow, the struggle, the solution. Every extracted fact gets tagged high, inferred, or gap, so assumptions get flagged instead of smuggled in as fact.",
      },
      {
        lead: 'Brief → beats.',
        text: "intentInterpreter reads the brief and decides the 'perspective shift,' the actual angle of the story, then drafts five beats with 2–4 pillars each. storyMapper remaps those beats onto whichever framework you picked. Because content is stored as data (NarrativeState), switching STAR to BLUF mid-draft doesn't lose a word. It just relabels the same beats.",
      },
      {
        lead: 'Beats → the murder board.',
        text: "Two critics run in parallel on every draft. The Skeptic flags claims with no evidence behind them. The Storyteller flags dead pacing and buried punchlines. A scoring engine turns both into 0–100 numbers per beat. Toggle a stakeholder lens on top of that and lensAnalyzer re-frames the same content, unchanged, through a PM's, an exec's, or a recruiter's read.",
      },
      {
        text: "Beats → slides. slideDistribution.ts decides how many pillars fit per slide based on the length you picked (three for short, one for detailed) and splits overflow into 'Part 1 of 2' instead of cramming everything onto one slide. slideArchitect maps beats to layout templates, visualPlanner decides chart vs. text per slide, and slideInterpreter compiles the result into plain semantic HTML with zero inline styles, so it drops into any of 32 CSS-variable-driven themes.",
      },
    ],
    howTo: {
      intro: 'No install, just a browser tab. A few ways in:',
      items: [
        {
          lead: 'Start',
          text: "Paste a URL, drop in raw notes, or upload a screenshot. Pick a framework - STAR, SOAR, PREP, BLUF, AIDA - or let the system suggest one based on your audience and intent.",
        },
        {
          lead: 'Fill the beats',
          text: "Five narrative slots, in whatever order you want. The chat assistant asks targeted questions when it detects a gap instead of letting you leave a beat vague.",
        },
        {
          lead: 'Run the murder board',
          text: "Trigger the critique pass any time. Skeptic and storyteller critics score each beat and flag exactly what's weak, with a surgical refinement loop that edits only the flagged beat, never the whole draft.",
        },
        {
          lead: 'Check the lenses',
          text: "Toggle PM, exec, recruiter, or peer view to see how the same content reads to each audience before you're in the room.",
        },
        {
          lead: 'Export',
          text: "Pull the finished presentation as structured JSON, or preview it compiled into themed HTML slides.",
        },
      ],
    },
    expectations: [
      {
        text: "It needs an OpenRouter API key to do anything AI-powered. Every LLM call routes through one gateway, nothing hardcoded to a single model provider. Without a key, you get the deterministic fallback path this started as.",
      },
      {
        text: "This is a lab, not a finished product. Part of the pipeline is mid-rebuild right now: going from 14 subagents to 16, adding cross-document synthesis and a pre-draft intent-interrogation step, unifying scoring and critique into one report. Expect the agent roster and the docs to keep moving.",
      },
    ],
    versions: [
      {
        lead: 'May 2026 — MVP.',
        text: 'Deterministic generator, no AI in the loop yet. URL input, Express backend, first UI pass.',
      },
      {
        lead: 'May–Jun 2026 — Hub + scoring engine.',
        text: 'Full hub workspace shipped: beats, pillars, kanban, multi-lens reasoning, quality scoring, smart slide distribution.',
      },
      {
        lead: 'Jun 2026 — Security hardening.',
        text: 'CORS, per-IP rate limiting, Zod validation at every route boundary, CSP headers, Jina Reader fallback for JS-rendered pages.',
      },
      {
        lead: 'Jul 2026 — 14-agent pipeline.',
        text: 'Centralized prompt building across all subagents, vision capture, voice calibration, full slide-architecture and rendering pipeline.',
      },
      {
        lead: 'Aug 2026 — Error surfacing, mid-redesign.',
        text: 'Stream failures now show a real error message instead of silently resetting the UI. In progress: a 16-agent redesign adding cross-document synthesis and pre-draft intent interrogation, unified critique/scoring, and the last of the Context Builder gap-question wiring.',
      },
    ],
  },
}

export default meta
