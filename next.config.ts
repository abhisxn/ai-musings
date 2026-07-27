import type { NextConfig } from 'next'
import path from 'node:path'

const nextConfig: NextConfig = {
  basePath: '/musings',
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  outputFileTracingRoot: path.resolve(__dirname),
}

export default nextConfig
