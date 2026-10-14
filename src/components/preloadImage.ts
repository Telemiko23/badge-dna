/** Resolves once the image has loaded; rejects on failure. Used before an extra clue is shown. */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error('empty image url'))
      return
    }
    const image = new Image()
    image.onload = () => resolve()
    image.onerror = () => reject(new Error(`failed to load ${url}`))
    image.src = url
  })
}
