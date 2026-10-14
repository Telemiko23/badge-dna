export type Route =
  | { name: 'home' }
  | { name: 'practice' }
  | { name: 'how-to' }
  | { name: 'settings' }
  | { name: 'daily'; date: string }

const SIMPLE = ['practice', 'how-to', 'settings'] as const

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, '')
  const daily = /^daily\/(\d{4}-\d{2}-\d{2})$/.exec(path)
  if (daily) return { name: 'daily', date: daily[1] }
  const simple = SIMPLE.find((name) => name === path)
  return simple ? { name: simple } : { name: 'home' }
}

export function routeHash(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/'
    case 'daily':
      return `#/daily/${route.date}`
    default:
      return `#/${route.name}`
  }
}
