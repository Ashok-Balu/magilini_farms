import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  client: {
    interceptors: { response: { use: vi.fn() } }
  },
  create: vi.fn(),
  successHandler: null,
  errorHandler: null
}))

vi.mock('axios', () => ({
  default: {
    create: mocks.create
  }
}))

describe('API client', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    vi.clearAllMocks()
    mocks.client.interceptors.response.use.mockImplementation((success, error) => {
      mocks.successHandler = success
      mocks.errorHandler = error
    })
    mocks.create.mockReturnValue(mocks.client)
    vi.spyOn(window, 'dispatchEvent')
  })

  it('configures cookie credentials, JSON headers, and the default API base URL', async () => {
    const { default: api } = await import('../../src/lib/api.js')
    expect(api).toBe(mocks.client)
    expect(mocks.create).toHaveBeenCalledWith({
      baseURL: '/api',
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' }
    })
  })

  it.each([
    ['http://localhost:5000', 'http://localhost:5000/api'],
    ['https://shop.example/api/', 'https://shop.example/api'],
    ['/api/', '/api'],
    [' https://shop.example/custom ', 'https://shop.example/custom/api']
  ])('normalizes API URL %s to %s', async (configuredUrl, expectedUrl) => {
    vi.stubEnv('VITE_API_URL', configuredUrl)
    await import('../../src/lib/api.js')
    expect(mocks.create.mock.calls[0][0].baseURL).toBe(expectedUrl)
  })

  it('dispatches auth expiry for protected 401 responses but excludes auth check and logout', async () => {
    await import('../../src/lib/api.js')
    const dispatch = vi.spyOn(window, 'dispatchEvent')
    const protectedError = { config: { url: '/orders' }, response: { status: 401 } }
    await expect(mocks.errorHandler(protectedError)).rejects.toBe(protectedError)
    expect(dispatch).toHaveBeenCalledWith(expect.any(CustomEvent))
    expect(dispatch.mock.calls[0][0].type).toBe('auth:expired')

    dispatch.mockClear()
    await expect(mocks.errorHandler({ config: { url: '/auth/me' }, response: { status: 401 } })).rejects.toBeDefined()
    await expect(mocks.errorHandler({ config: { url: '/auth/logout' }, response: { status: 401 } })).rejects.toBeDefined()
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('passes successful responses through unchanged', async () => {
    await import('../../src/lib/api.js')
    const response = { status: 200, data: { success: true } }
    expect(mocks.successHandler(response)).toBe(response)
  })
})
