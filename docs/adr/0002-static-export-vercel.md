# 0002 — Static Export + Vercel Deployment

**Status:** accepted
**Date:** 2026-06-01

## Decision
The Next.js app uses `output: 'export'` in `next.config.ts`, producing a static site deployed to Vercel. Push to main triggers auto-deploy. No manual deploy steps.

## Why
This is a creative portfolio, not a SaaS product. Static export eliminates server costs, cold starts, and operational complexity. Vercel's free tier handles the traffic. The tradeoff (no server-side features) is acceptable because no experiment requires dynamic server logic.

## Consequences
Easier: zero-config deploy, no server maintenance, fast global CDN delivery.
Harder: no API routes, no server components with data fetching, no dynamic OG images. Any feature requiring a server must use a third-party service or be rethought.
