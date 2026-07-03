import { MantineProvider } from '@mantine/core'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import MainLayout from '../MainLayout'
import { UpdateNotificationProvider } from '../../contexts/UpdateNotificationContext'
import type { QClawUpdateStatus } from '../../shared/openclaw-phase4'

function createAvailableUpdateStatus(): QClawUpdateStatus {
  return {
    ok: true,
    supported: true,
    configured: true,
    currentVersion: '2.2.0',
    availableVersion: '2.2.1',
    status: 'available',
    progressPercent: null,
    downloaded: false,
    releaseDate: '2026-04-10',
    releaseNotes: 'UI preview',
  }
}

function renderLayout(path: string, initialUpdate?: QClawUpdateStatus) {
  return renderToStaticMarkup(
    <MantineProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/"
            element={
              <UpdateNotificationProvider initialUpdate={initialUpdate}>
                <MainLayout />
              </UpdateNotificationProvider>
            }
          >
            <Route index element={<div>content</div>} />
            <Route path="channels" element={<div>content</div>} />
            <Route path="settings" element={<div>content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </MantineProvider>
  )
}

function getLinkClass(html: string, label: string) {
  const links = Array.from(html.matchAll(/<a\s+([^>]*)>([\s\S]*?)<\/a>/g))
  const match = links.find(([, , content]) => content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() === label)
  expect(match, `Expected link for ${label}`).toBeDefined()

  const classMatch = match?.[1].match(/class="([^"]*)"/)
  return classMatch?.[1] || ''
}

function expectActiveLink(html: string, label: string) {
  expect(getLinkClass(html, label)).toContain('bg-[var(--mantine-color-brand-light)]')
}

function expectInactiveLink(html: string, label: string) {
  expect(getLinkClass(html, label)).not.toContain('bg-[var(--mantine-color-brand-light)]')
}

describe('MainLayout', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders command center navigation grouped by domain', () => {
    vi.stubGlobal('window', {
      api: {
        platform: 'darwin',
      },
    })

    const html = renderLayout('/')

    expect(html).toContain('总览')
    expect(html).toContain('AI 使用')
    expect(html).toContain('OpenClaw 运维')
    expect(html).toContain('数据保护')
    expect(html).toContain('指挥台')
    expect(html).toContain('配置差异')
    expect(html).not.toContain('计划')
  })

  it('only highlights the command center item on the dashboard route', () => {
    vi.stubGlobal('window', {
      api: {
        platform: 'darwin',
      },
    })

    const html = renderLayout('/')

    expectActiveLink(html, '指挥台')
    expectInactiveLink(html, '服务')
    expectInactiveLink(html, 'Gateway')
    expectInactiveLink(html, '日志')
    expectInactiveLink(html, '备份')
  })

  it('highlights bottom settings without highlighting settings-routed placeholders', () => {
    vi.stubGlobal('window', {
      api: {
        platform: 'darwin',
      },
    })

    const html = renderLayout('/settings')

    expectActiveLink(html, '设置')
    expectInactiveLink(html, '配置差异')
    expectInactiveLink(html, '恢复')
  })

  it('highlights channels without highlighting the plugin placeholder', () => {
    vi.stubGlobal('window', {
      api: {
        platform: 'darwin',
      },
    })

    const html = renderLayout('/channels')

    expectActiveLink(html, '渠道')
    expectInactiveLink(html, '插件')
  })

  it('keeps settings and the update reminder in the same bottom navigation row with filled primary styling', () => {
    vi.stubGlobal('window', {
      api: {
        platform: 'darwin',
      },
    })

    const html = renderLayout('/settings', createAvailableUpdateStatus())

    expect(html).toContain('设置')
    expect(html).toContain('新版本')
    expect(html).toContain('mt-auto pt-2 border-t app-border')
    expect(html).toContain('flex items-center gap-2')
    expect(html).not.toContain('<span class="truncate">设置</span>')
    expect(html).toContain('inline-flex shrink-0 items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors')
    expect(html).toContain('border-0 outline-none focus:outline-none focus-visible:outline-none appearance-none')
    expect(html).toMatch(
      /<button[^>]*bg-\[var\(--mantine-primary-color-filled\)\][^>]*text-\[var\(--mantine-primary-color-contrast\)\][^>]*>新版本<\/button>/
    )
  })
})
