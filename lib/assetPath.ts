const BASE_PATH = '/musings'

export function assetPath(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith(BASE_PATH)) {
    return path
  }
  return `${BASE_PATH}${path}`
}
