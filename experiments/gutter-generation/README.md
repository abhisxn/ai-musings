# Gutter Generation

## Design POV
Satire needs a mechanic, not just a skin. A crowd that surrounds and watches a dropped-in subject only reads as a reversal if the physics is convincing enough to feel like attention, not decoration.

## What It Is
A DOM-physics crowd toy, and an ode to a real protest movement. Drop in an avatar and a crowd of eyes, cockroaches, pointed fingers, and placards reacts to it in real time - tracking, swarming, refusing to let it hide. No canvas anywhere; every creature is a real, force-repelled DOM element.

## What It Does
- Simulates a crowd of independently repelled DOM creatures across four modes (eyes / cockroach / pointed finger / placard)
- Tracks and reacts to a dropped-in avatar with real physics, not a scripted animation
- Runs a security-raid mechanic: shaking the avatar summons police/RAF units that thin the crowd
- Runs a hold-and-release Protest power that fights back, with full/medium/low power outcomes
- Shares one EntityPool/raidRules primitive across crowd and security lifecycles instead of duplicated bookkeeping

## The Problem
Most reactive-crowd web toys default to a canvas particle system with no individual agent behavior, or a single hero character with a scripted loop. Neither supports a crowd that reacts to a subject individually while still behaving like a crowd - which is what the actual protest looked like: not one face, thousands of ordinary ones.

## STAR

**Situation.** A generation got called cockroaches and gutter generation by the people it was protesting, and wore both insults as badges instead of flinching from them. That's a story about a crowd, not one hero.

**Task.** Build something with real physical feel: a crowd of independently simulated agents reacting to one dropped-in subject, plus a way for that crowd to escalate and recover the way an actual protest does.

**Action.** Shipped four version arcs. v1 proved the physics loop. v2 added mode-locked crowd variants. v3 replaced the canvas/power system with the current DOM-based creature architecture. v4 added the security-raid and protest-recovery mechanic.

**Result.** A crowd that behaves like a crowd - spawn/despawn timing, separation, chase behavior, and the raid-and-recovery lifecycle all sharing one pooling primitive instead of four copies of similar bookkeeping.

(Full write-up of what this is an ode to, and what a viewer can actually do about it, is in [ABOUT.md](https://github.com/abhisxn/fun-satire/blob/main/ABOUT.md) in the source repo.)

## Links
- Live app: https://www.guttergeneration.com
- Source: https://github.com/abhisxn/fun-satire

## Structure
This experiment doesn't run inline. It's a full standalone Vite app on its own Vercel deployment. `index.tsx` here is a launcher card with links out to the live app and the repo, not an embed of the app itself.
