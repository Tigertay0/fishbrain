// Opening the app at the water should show that water: centre the map on the
// angler at launch, unless they have turned location off for this site.

type Geo = Pick<Navigator, 'geolocation'> & { permissions?: Pick<Permissions, 'query'> }

export async function shouldLocateOnOpen(nav: Geo = navigator, search: string = location.search): Promise<boolean> {
  if (!nav.geolocation) return false
  // A link to a spot (?focus=...) wins over "where am I".
  if (new URLSearchParams(search).has('focus')) return false
  try {
    const status = await nav.permissions?.query({ name: 'geolocation' })
    if (status) return status.state !== 'denied'
  } catch {
    // Older Safari can't query this permission: ask, and let the browser remember the answer.
  }
  return true
}
