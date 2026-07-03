// @vitest-environment happy-dom

import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import CommandCenter from '../CommandCenter'
import {
  createDefaultOpenClawRuntimeReconcileStore,
  type OpenClawRuntimeReconcileStore,
} from '../../shared/gateway-runtime-reconcile-state'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type TestApi = Record<string, ReturnType<typeof vi.fn>>

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
}

const WRITE_API_NAMES = [
  'repairIncompatiblePlugins',
  'repairManagedChannel',
  'repairOpenClawConfig',
  'deleteOpenClawData',
  'cleanupOpenClawData',
  'applyDefaultModelWithGatewayReload',
]

function createRuntimeStore(
  overrides: Partial<OpenClawRuntimeReconcileStore['runtime']> = {}
): OpenClawRuntimeReconcileStore {
  const store = createDefaultOpenClawRuntimeReconcileStore()
  return { ...store, runtime: { ...store.runtime, ...overrides } }
}

function createApi(overrides: Partial<TestApi> = {}): TestApi {
  const api: TestApi = {
    gatewayHealth: vi.fn().mockResolvedValue({ running: true }),
    getOpenClawRuntimeReconcileState: vi.fn().mockResolvedValue(createRuntimeStore({
      stateCode: 'ready',
      lastReconcileSummary: '运行时快照已同步。',
    })),
    readConfig: vi.fn().mockResolvedValue({ models: { providers: [{ id: 'openai', enabled: true }] } }),
    getModelStatus: vi.fn().mockResolvedValue({ ok: true, data: { defaultModel: 'openai/gpt-5.4-pro' } }),
    getModelCapabilities: vi.fn().mockResolvedValue({ data: { defaultModel: 'openai/fallback-model' } }),
    getOpenClawBackupRoot: vi.fn().mockResolvedValue({ displayRootDirectory: '/Users/wait/OpenClaw/backups' }),
    ensureGatewayRunning: vi.fn().mockResolvedValue({ ok: true, running: true }),
  }
  for (const name of WRITE_API_NAMES) api[name] = vi.fn().mockResolvedValue({ ok: true })
  Object.assign(api, overrides)
  return api
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
}

async function renderCommandCenter(api = createApi(), withRoutes = false) {
  Object.defineProperty(window, 'api', { configurable: true, writable: true, value: api })
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root: Root = createRoot(container)

  await act(async () => {
    root.render(
      withRoutes ? (
        <MemoryRouter initialEntries={['/command-center']}>
          <Routes>
            <Route path="/command-center" element={<CommandCenter />} />
            <Route path="/channels" element={<div data-testid="channels-page">Channels route</div>} />
            <Route path="/models" element={<div data-testid="models-page">Models route</div>} />
            <Route path="/settings" element={<div data-testid="settings-page">Settings route</div>} />
          </Routes>
        </MemoryRouter>
      ) : (
        <MemoryRouter>
          <CommandCenter />
        </MemoryRouter>
      )
    )
  })
  await act(async () => {
    await Promise.resolve()
  })

  return {
    api,
    container,
    unmount() {
      act(() => root.unmount())
      container.remove()
    },
  }
}

function getButtonByText(container: HTMLElement, label: string) {
  const button = Array.from(container.querySelectorAll('button')).find(
    (candidate): candidate is HTMLButtonElement => candidate.textContent?.trim() === label
  )
  expect(button, `Expected button with label ${label}`).toBeDefined()
  return button!
}

function getRepairButton(container: HTMLElement, repairTitle: string) {
  const heading = Array.from(container.querySelectorAll('h3')).find((candidate) =>
    candidate.textContent?.includes(repairTitle)
  )
  expect(heading, `Expected repair heading ${repairTitle}`).toBeDefined()
  const button = heading!.closest('article')!.querySelector('button')
  expect(button).toBeDefined()
  return button as HTMLButtonElement
}

function expectNoWriteApisCalled(api: TestApi) {
  for (const name of WRITE_API_NAMES) {
    expect(api[name], `${name} should not be called`).not.toHaveBeenCalled()
  }
}

describe('CommandCenter page', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Reflect.deleteProperty(window, 'api')
  })

  it('loads only safe snapshot APIs on initial render and avoids repair writes', async () => {
    const view = await renderCommandCenter()
    try {
      expect(view.api.gatewayHealth).toHaveBeenCalledTimes(1)
      expect(view.api.getOpenClawRuntimeReconcileState).toHaveBeenCalledTimes(1)
      expect(view.api.readConfig).toHaveBeenCalledTimes(1)
      expect(view.api.getModelStatus).toHaveBeenCalledTimes(1)
      expect(view.api.getOpenClawBackupRoot).toHaveBeenCalledTimes(1)
      expect(view.api.ensureGatewayRunning).not.toHaveBeenCalled()
      expectNoWriteApisCalled(view.api)
    } finally {
      view.unmount()
    }
  })

  it('passes loaded snapshots into the command center view', async () => {
    const view = await renderCommandCenter()
    try {
      expect(view.container.textContent).toContain('Command Center')
      expect(view.container.textContent).toContain('在线')
      expect(view.container.textContent).toContain('运行时快照已同步。')
      expect(view.container.textContent).toContain('openai/gpt-5.4-pro')
      expect(view.container.textContent).toContain('/Users/wait/OpenClaw/backups')
    } finally {
      view.unmount()
    }
  })

  it('keeps CommandCenter mounted when confirmation-required repairs surface safety copy', async () => {
    const api = createApi({
      getOpenClawRuntimeReconcileState: vi.fn().mockResolvedValue(createRuntimeStore({
        stateCode: 'blocked',
        blockingReason: 'provider_plugin_not_ready',
        lastReconcileSummary: '插件状态和期望配置不一致。',
      })),
    })
    const view = await renderCommandCenter(api, true)

    try {
      await act(async () => {
        getRepairButton(view.container, '插件版本漂移需要确认').click()
      })

      expect(view.container.textContent).toContain('Command Center')
      expect(view.container.textContent).toContain('确认插件修复')
      expect(view.container.textContent).toContain('需要你确认后再执行')
      expect(view.container.querySelector('[data-testid="channels-page"]')).toBeNull()
      expectNoWriteApisCalled(view.api)
      expect(view.api.ensureGatewayRunning).not.toHaveBeenCalled()
    } finally {
      view.unmount()
    }
  })

  it('ignores older overlapping snapshot loads after a newer refresh has rendered', async () => {
    const slowGatewayHealth = createDeferred<{ running: boolean }>()
    const api = createApi({
      gatewayHealth: vi.fn()
        .mockResolvedValueOnce({ running: true })
        .mockReturnValueOnce(slowGatewayHealth.promise)
        .mockResolvedValueOnce({ running: true }),
    })
    const view = await renderCommandCenter(api)

    try {
      expect(view.container.textContent).toContain('在线')
      await act(async () => {
        getButtonByText(view.container, '打开 / 重启').click()
      })
      await act(async () => {
        getButtonByText(view.container, '打开 / 重启').click()
      })
      await act(async () => {
        await Promise.resolve()
      })
      expect(view.api.gatewayHealth).toHaveBeenCalledTimes(3)
      expect(view.container.textContent).toContain('在线')
      await act(async () => {
        slowGatewayHealth.resolve({ running: false })
        await slowGatewayHealth.promise
      })
      expect(view.container.textContent).toContain('在线')
      expect(view.container.textContent).not.toContain('离线')
    } finally {
      view.unmount()
    }
  })

  it('allows gateway restart to call ensureGatewayRunning and then refresh read snapshots', async () => {
    const api = createApi({
      gatewayHealth: vi.fn().mockResolvedValueOnce({ running: false }).mockResolvedValueOnce({ running: true }),
    })
    const view = await renderCommandCenter(api)

    try {
      await act(async () => {
        getButtonByText(view.container, '自动重启').click()
      })
      await act(async () => {
        await Promise.resolve()
      })

      expect(view.api.ensureGatewayRunning).toHaveBeenCalledTimes(1)
      expect(view.api.gatewayHealth).toHaveBeenCalledTimes(2)
      expect(view.api.getOpenClawRuntimeReconcileState).toHaveBeenCalledTimes(2)
      expect(view.api.readConfig).toHaveBeenCalledTimes(2)
      expect(view.api.getModelStatus).toHaveBeenCalledTimes(2)
      expect(view.api.getOpenClawBackupRoot).toHaveBeenCalledTimes(2)
      expectNoWriteApisCalled(view.api)
    } finally {
      view.unmount()
    }
  })
})
