import { beforeEach, describe, expect, it, vi } from 'vitest'

const routerPlugin = vi.hoisted(() => ({
  install: vi.fn((app) => {
    app.component('router-view', { template: '<main id="route-outlet"></main>' })
  })
}))

vi.mock('../src/router/index.js', () => ({ default: routerPlugin }))

describe('application entry point', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
    document.body.innerHTML = '<div id="app"></div>'
    routerPlugin.install.mockClear()
  })

  it('installs Pinia and the router and mounts the root application', async () => {
    await import('../src/main.js')

    expect(routerPlugin.install).toHaveBeenCalledOnce()
    expect(document.querySelector('#app #route-outlet')).not.toBeNull()
  })
})
