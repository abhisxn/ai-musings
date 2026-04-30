# Reusable Patterns

This file grows as experiments are built. Add a pattern here when you've used it twice.

---

## p5.js Canvas Setup (Next.js compatible)
Use the `react-p5` wrapper to mount a p5 sketch inside a React component.
Avoids SSR issues with Next.js.

```tsx
import dynamic from 'next/dynamic'
const Sketch = dynamic(() => import('react-p5'), { ssr: false })

export default function MySketch() {
  const setup = (p5, canvasParentRef) => {
    p5.createCanvas(window.innerWidth, window.innerHeight).parent(canvasParentRef)
  }
  const draw = (p5) => {
    // draw loop here
  }
  return <Sketch setup={setup} draw={draw} />
}
```

---

## Three.js + cannon.es Physics Loop
Standard setup pairing Three.js rendering with cannon.es physics world.
See: experiments/[first-physics-experiment] once built.

---

## Tone.js Event Trigger
Trigger a note on a collision or event:
```js
import * as Tone from 'tone'
const synth = new Tone.Synth().toDestination()
// On event:
synth.triggerAttackRelease('C4', '8n')
```

---

## Vercel Deploy Check
Run `vercel --prod` from root to force a production deploy.
Or just push to main — auto-deploy is configured.

---

> Add new patterns here after building. Don't add theoretical patterns — only ones that have run in production.