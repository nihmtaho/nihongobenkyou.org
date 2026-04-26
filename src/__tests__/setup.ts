import 'fake-indexeddb/auto'

// jsdom does not implement IntersectionObserver — stub it for components that use AudioButton
globalThis.IntersectionObserver = class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof IntersectionObserver
