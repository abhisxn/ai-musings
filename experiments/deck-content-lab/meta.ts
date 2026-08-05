import { ExperimentMeta } from '@/lib/types'

const meta: ExperimentMeta = {
  slug: 'deck-content-lab',
  title: 'Deck Content Lab',
  description: 'A narrative-first AI presentation builder. Story locked before a single slide exists.',
  summary: 'AI-orchestrated presentation builder that forces a story to hold together as structured data before any layout exists.',
  date: '2026-08-05',
  type: 'react',
  status: 'live',
  tags: ['ai', 'narrative', 'product', 'agent-orchestration', 'vibe-coding'],
  series: undefined,
  thumbnail: '/experiments/deck-content-lab/thumbnail.png',
  hero: '/experiments/deck-content-lab/hero.png',
  caseStudy: {
    about: [
      {
        text: "Deck Content Lab is a narrative engineering tool, not a slide generator. Pick a storytelling framework - STAR, SOAR, PREP, BLUF, AIDA - and it forces five narrative beats to hold together as data before a single slide exists. Slides get compiled from that structure at the end. They're not where the work happens, and that's a product decision, not a technical one.",
      },
      {
        lead: 'Situation.',
        text: "Every AI presentation tool on the market gives you tools to build a deck. None of them help you find the story already sitting across the dozen documents, decks, and threads you've already written. I kept hitting this myself. The material for a good case study was always there, just never assembled.",
      },
      {
        lead: 'Task.',
        text: "Build something that treats the narrative as the product, not the slides. Force a story to hold together as structured data before any layout exists, and put a real quality bar (critique, audience testing, voice, accessibility) between a draft and anything that ships.",
      },
      {
        lead: 'Action.',
        text: "Designed a 16-agent pipeline and directed most of it into existence with AI coding agents rather than hand-writing every layer myself. Extraction, synthesis, drafting, a murder board, voice calibration, rendering, QA. Each agent does one narrow job; deciding the org chart and where to put a gate is the actual design work.",
      },
      {
        lead: 'Result.',
        text: "A user goes from scattered notes to a scored, critiqued, audience-tested narrative in under 10 minutes. STAR is also literally one of the five frameworks the tool itself outputs. This case study is the joke on itself.",
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
        lead: "A quality gate isn't a feature you add later. It's the actual product.",
        text: "It would've been faster to stop at 'generate a draft' and call it done. Instead there's a dedicated layer before anything renders: a critic that challenges weak claims, a critic that checks pacing, an agent that rewrites flagged beats without touching the rest, an agent that strips the draft of AI-speak so it sounds like the person who wrote it. None of that is optional. A narrative that doesn't sound like you and a slide that clips text at the edge are the same failure: something that looks finished but isn't trustworthy.",
      },
      {
        lead: 'Five beats, always. Flexibility was the thing to refuse.',
        text: "Every framework the tool supports (STAR, SOAR, PREP, BLUF, AIDA) still maps to exactly five slots. Users can't add a sixth. That's a deliberate constraint, not a limitation I haven't gotten to. Unlimited flexibility is what makes most AI deck tools produce shapeless output. A story needs a spine, and a spine only works if it can't grow extra vertebrae on demand.",
      },
      {
        lead: "Sixteen agents isn't a feature count. It's an org chart, and someone has to run it.",
        text: "Each subagent does one narrow job on purpose. The actual design work wasn't writing prompts, it was deciding the org chart: where synthesis ends and drafting begins, which stage gets a real reasoning call versus a static rule, where a gate goes before the next stage is allowed to run. Directing that shape, mostly by pairing with AI coding agents rather than hand-writing every layer, is the same skill as running a build. The tool is a case study in the way it was built.",
      },
      {
        lead: "Multi-lens exists because the real fear isn't 'will this look good.' It's 'will I survive the room.'",
        text: "The PM lens, the exec lens, the recruiter lens aren't demo features. They're a rehearsal. Nobody opens a deck tool worried about kerning. They're worried about the one stakeholder who's going to ask the question they don't have an answer for yet. Building the audience simulation before the visual polish was the actual product bet.",
      },
      {
        lead: "The competitive gap wasn't 'nobody does narrative-first.' It was 'nobody starts from what you already have.'",
        text: "Every AI deck tool, including the narrative-first ones, starts from a blank prompt: type a topic, get a story. This one starts from a pile of source material, specs, old decks, screenshots, and finds the story that's already buried in there before a framework is even chosen. That's the actual product thesis, and it's also the hardest agent in the whole pipeline to get right.",
      },
    ],
    innerWorkings: [
      {
        text: "Sixteen agents, five layers, one manager deciding what each one is and isn't allowed to do. Source material goes in at one end, a rendered, quality-checked deck comes out the other. Nothing skips the queue.",
      },
      {
        lead: 'Intake & Synthesis.',
        text: "Every source document gets extracted in parallel, then narrativeSynthesizer reads all of them together and produces a NarrativeSeed: the recurring themes, the core tension, an evolution arc, candidate angles, and where the evidence across documents actually contradicts itself. intentInterrogator asks 3-5 sharp questions grounded in that seed before any framework gets picked. This layer is the actual product bet: finding the story, not writing one from scratch.",
      },
      {
        lead: 'Framework & Draft, then Critique & Audience.',
        text: "creativeStrategist argues for a framework and an angle. intentInterpreter and storyMapper turn that into five beats. Then the murder board runs: a Skeptic critic flags unsupported claims, a Storyteller critic flags dead pacing, narrativeInterrogator targets the weakest beat with a follow-up question, and lensAnalyzer re-frames the same content, unchanged, through a PM's, an exec's, or a recruiter's read.",
      },
      {
        lead: 'Quality Gate, then Visual Compilation.',
        text: "Before anything renders, contentFixer surgically rewrites only the flagged beats and voiceCalibrator strips AI-speak so the draft sounds like the person who wrote it. Only then does slideArchitect map beats to layout templates, visualPlanner assign components, and slideInterpreter compile the result into plain semantic HTML that drops into any of 32 themes. A sibling QA app checks the rendered output for accessibility and layout overflow before calling it done.",
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
        text: "This is a lab, not a finished product. The 16-agent pipeline (cross-document synthesis, unified critique, voice calibration) is live now, but the newest layer, automated accessibility and layout QA on the rendered output, is the youngest part of the system. Expect the roster and the docs to keep moving.",
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
        lead: 'Jul–Aug 2026 — Cross-document synthesis, 16 agents.',
        text: 'Added narrativeSynthesizer and intentInterrogator ahead of framework selection, so the pipeline finds the story across multiple source documents before drafting starts. Unified scoring and critique into one report, fixed the Context Builder gap-question loop, and surfaced stream failures as a real error message instead of a silent UI reset.',
      },
    ],
  },
}

export default meta
