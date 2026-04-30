import fs from 'fs'
import path from 'path'

const contentDir = path.join(process.cwd(), 'content', 'experiments')
const publicDir = path.join(process.cwd(), 'public', 'experiments')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function syncExperiment(slug: string) {
  const src = path.join(contentDir, slug)
  const dest = path.join(publicDir, slug)
  ensureDir(dest)

  const files = fs.readdirSync(src)
  for (const file of files) {
    if (file.endsWith('.html')) {
      fs.copyFileSync(path.join(src, file), path.join(dest, file))
      console.log(`Synced: ${slug}/${file}`)
    }
  }
}

const slugs = fs.readdirSync(contentDir).filter(f => !f.startsWith('_'))
for (const slug of slugs) {
  syncExperiment(slug)
}

console.log('Sync complete.')
