import { ExperimentMeta } from '@/lib/types'

const meta: ExperimentMeta = {
  slug: 'gutter-generation',
  title: 'Gutter Generation',
  description: 'A DOM-physics crowd that watches back. Drop in an avatar and a force-repelled crowd of eyes, cockroaches, pointed fingers, and placards reacts to it, in real time, with no canvas anywhere.',
  summary: 'Physics-driven protest satire toy: a crowd of DOM creatures that tracks, swarms, and refuses to let a dropped-in avatar hide.',
  date: '2026-08-18',
  type: 'react',
  status: 'live',
  tags: ['physics', 'dom-simulation', 'satire', 'product', 'game-design'],
  series: undefined,
  thumbnail: '/experiments/gutter-generation/thumbnail.png',
  hero: '/experiments/gutter-generation/hero.png',
  caseStudy: {
    about: [
      {
        text: "Gutter Generation is a DOM-physics crowd toy built as an ode to a real protest movement. Drop an avatar into the scene and a crowd of eyes, cockroaches, pointed fingers, and placards reacts to it, tracking it, swarming it, refusing to let it hide. No canvas anywhere - every creature is a real, force-repelled DOM element.",
      },
      {
        lead: 'Situation.',
        text: "A generation got called cockroaches and gutter generation by the people it was protesting, and wore both insults as badges instead of flinching from them. That's a story about a crowd, not one hero - and most protest-inspired web toys default to a single scripted interaction instead of a crowd that actually behaves like one.",
      },
      {
        lead: 'Task.',
        text: "Build something with real physical feel instead of a static page: a crowd of independently simulated agents that all react to one dropped-in subject, plus a way for that crowd to escalate and recover the way an actual protest does - pushed back, thinned, rebuilt.",
      },
      {
        lead: 'Action.',
        text: "Shipped four version arcs. v1 proved the physics loop with one creature mode and one power. v2 added mode-locked crowd variants with no-overlap separation and look-at rotation. v3 replaced the entire canvas/power system with the current DOM-based creature architecture, adding placards, a gallery, and an onboarding carousel. v4 added the security-raid and protest-recovery mechanic: shaking the avatar summons police units that thin the crowd, and a hold-and-release Protest power fights back.",
      },
      {
        lead: 'Result.',
        text: "A crowd that behaves like a crowd, not sprites bouncing off a boundary. Spawn and despawn timing, separation, chase behavior, and the raid-and-recovery lifecycle all share one pooling primitive instead of four copies of similar bookkeeping.",
      },
    ],
    exploring: [
      {
        text: "Most reactive-crowd web toys take one of two easy outs: a canvas particle system with no individual agent behavior, or a single hero character on a scripted animation loop. Neither supports a crowd that notices and reacts to a subject individually while still behaving like a crowd - canvas particles are cheap exactly because they don't negotiate with each other, and DOM elements are expensive exactly because they do. Building on raw, mutually-repelling DOM elements was the harder, less obvious choice, and the one that actually matches what the source protest looked like: not one face, thousands of ordinary ones.",
      },
      {
        text: "The security-raid mechanic exists because the real ending of a protest engagement isn't 'you win, credits roll' - it's a spectrum from fully suppressed to holding the ground. The four crowd-recovery outcomes (full, medium, low, none) are the game-design translation of that spectrum.",
      },
    ],
    learnings: [
      {
        lead: 'A crowd needs one shared lifecycle primitive, or every new behavior duplicates the last one\'s bugs.',
        text: "Crowd spawn/despawn staggering and decay-toward-floor logic, and the security units' own spawn, repel, and despawn lifecycle, ended up sharing one EntityPool/raidRules primitive instead of two parallel systems slowly drifting apart. That consolidation only became obvious after building the second system and noticing it was quietly re-solving the first one's problems.",
      },
      {
        lead: 'The physics has to hold up under a mode switch, not just in isolation.',
        text: "Eyes track, cockroaches swarm, fingers point, placards raise - four different visual behaviors riding the same repulsion and separation core. Building four separate physics loops for four creature types would have meant four separate places for the same bug to hide.",
      },
      {
        lead: 'Satire needs a mechanic, not just a skin.',
        text: "The idea only becomes a toy through a reversal: the crowd surrounds and watches the dropped-in subject, instead of a single figure looming over a crowd. That reversal only reads if the tracking and repulsion behavior is convincing enough to feel like attention, not decoration - which is why the physics came before the visual polish in the build order.",
      },
    ],
    innerWorkings: [
      {
        text: "No canvas anywhere. Every eye, cockroach, finger, and placard is a real DOM element, individually positioned and force-repelled every frame.",
      },
      {
        lead: 'Creature modes.',
        text: "CreatureMode ('eyes' | 'pointedFinger' | 'cockroach' | 'placard') selects behavior and rendering inside CreatureGrid and creaturePhysics.ts. Adding a new mode is additive - it doesn't require forking the grid or the physics loop, since every mode rides the same repulsion and separation core and only swaps its own tracking and render behavior.",
      },
      {
        lead: 'The raid and recovery lifecycle.',
        text: "Shaking the dropped-in avatar summons wandering security units that repel and permanently thin the crowd. A hold-and-release Protest button charges a power meter: full power wins outright (a win panel, the sticker locking to the floor, the avatar's repel radius widening), medium and low power partially regrow the crowd and escalate the raid instead. Crowd staggering, decay-toward-floor, and the security units' own lifecycle all share one EntityPool/raidRules primitive rather than duplicated bookkeeping.",
      },
      {
        lead: 'HUD and onboarding.',
        text: "A DOM HUD layer - gallery, filters, a menu panel, an onboarding carousel - sits above the physics scene, with a lightweight poof as the only staged animation. Everything else is the physics resolving in real time.",
      },
    ],
    howTo: {
      intro: 'No install, just a browser tab. A few ways in:',
      items: [
        {
          lead: 'Pick or drop an avatar',
          text: "Choose a preset sticker or drop in your own; the crowd immediately starts reacting to it.",
        },
        {
          lead: 'Switch crowd modes',
          text: "Toggle between eyes, cockroaches, pointed fingers, and placards from the menu panel - same physics, different behavior.",
        },
        {
          lead: 'Shake it',
          text: "Shake or drag the avatar to trigger the security raid and watch the crowd thin.",
        },
        {
          lead: 'Protest back',
          text: "Hold the Protest button to charge a power meter, then release - full power wins the round outright, partial power regrows part of the crowd.",
        },
        {
          lead: 'Read the why',
          text: "ABOUT.md in the repo lays out what the toy is an ode to, and what it's asking the viewer to actually do about it beyond the browser tab.",
        },
      ],
    },
    expectations: [
      {
        text: "This is satire built on top of a real protest movement, not a neutral tech demo - the tone is intentional, not a placeholder waiting for a more corporate rewrite.",
      },
      {
        text: "v1 through v4 are all shipped; nothing here is a stub. It has a cross-browser compatibility pass, a unit test suite, and an accessibility/performance pass on the sticker-loading path.",
      },
    ],
    versions: [
      {
        lead: 'v1 — Core physics.',
        text: 'Eyes mode, a laser-burn power, the core repulsion loop, a DOM HUD, and a cross-browser compatibility matrix.',
      },
      {
        lead: 'v2 — Multi-mode crowd.',
        text: 'Three crowd modes (eyes, bugs, pointed finger) with mode-locked power pairing, no-overlap separation, look-at rotation, and subject skins.',
      },
      {
        lead: 'v3 — DOM creature rebuild.',
        text: 'Replaced the canvas/power system entirely with the current DOM-based creature architecture - eyes, cockroach, pointed finger, placard - plus a gallery, onboarding carousel, and menu panel.',
      },
      {
        lead: 'v4 — Security raid & protest recovery.',
        text: 'Shaking the avatar summons police and RAF units that thin the crowd; a hold-and-release Protest power fights back, with full, medium, and low power outcomes sharing one EntityPool/raidRules primitive instead of duplicated bookkeeping.',
      },
      {
        lead: 'Aug 2026 — Asset performance pass.',
        text: 'Sticker assets converted to webp with generated thumbnails, lazy loading, and an idle-callback-based preloader, after profiling showed sticker loading as the actual performance bottleneck.',
      },
    ],
  },
}

export default meta
