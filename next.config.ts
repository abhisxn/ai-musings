import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  basePath: '/musings',
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
}

export default nextConfig
