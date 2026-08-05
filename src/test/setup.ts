import '@testing-library/jest-dom/vitest'

Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value: () => undefined,
})

Object.defineProperty(window.SVGElement.prototype, 'focus', {
  configurable: true,
  value: () => undefined,
})
