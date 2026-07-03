import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Tooltip } from '@mantine/core'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import logoSrc from '@/assets/logo.png'
import tooltips from '@/constants/tooltips.json'
import { useUpdateNotification } from '../contexts/UpdateNotificationContext'
import { COMMAND_CENTER_NAV_GROUPS } from '../shared/command-center-state'

interface NavItemMeta {
  to: string
  tooltip?: string
  icon?: ReactNode
}

const NAV_ITEM_META: Record<string, NavItemMeta> = {
  'command-center': {
    to: '/',
    tooltip: tooltips.layout.navigation.dashboardExplain,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  chat: {
    to: '/chat',
    tooltip: tooltips.layout.navigation.chatExplain,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  channels: {
    to: '/channels',
    tooltip: tooltips.layout.navigation.channelsExplain,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" />
      </svg>
    ),
  },
  plugins: {
    to: '/channels',
    tooltip: tooltips.layout.navigation.channelsExplain,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" />
      </svg>
    ),
  },
  models: {
    to: '/models',
    tooltip: tooltips.layout.navigation.modelsExplain,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  skills: {
    to: '/skills',
    tooltip: tooltips.layout.navigation.skillsExplain,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
      </svg>
    ),
  },
  service: { to: '/' },
  gateway: { to: '/' },
  logs: { to: '/' },
  backup: { to: '/' },
  'config-diff': { to: '/settings' },
  restore: { to: '/settings' },
}

const NON_HIGHLIGHT_NAV_ITEM_IDS = new Set(['service', 'gateway', 'plugins', 'logs', 'backup', 'config-diff', 'restore'])

function getNavItemMeta(id: string) {
  return NAV_ITEM_META[id] ?? { to: '/' }
}

export default function MainLayout() {
  const location = useLocation()
  const { state: updateState, openConfirmDialog } = useUpdateNotification()
  const [writeProtection, setWriteProtection] = useState({
    enabled: true,
    maintenanceMode: false,
    envOverride: false,
  })

  useEffect(() => {
    void window.api?.getOpenClawWriteProtectionStatus?.()
      .then((status) => {
        if (status) setWriteProtection(status)
      })
      .catch(() => {})
  }, [])

  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/'
    return location.pathname.startsWith(to)
  }

  const handleToggleMaintenanceMode = async () => {
    const nextEnabled = !writeProtection.maintenanceMode && !writeProtection.envOverride
    if (nextEnabled) {
      const accepted = window.confirm(
        [
          '进入维护模式后，Qclaw 将允许模型、Skill、插件、渠道、版本升级等写入操作。',
          '请只在你明确要修改 OpenClaw 时开启。',
          '维护模式只对本次运行生效，重启 Qclaw 后会恢复只读保护。',
          '',
          '是否进入维护模式？',
        ].join('\n')
      )
      if (!accepted) return
    }

    const status = await window.api.setOpenClawMaintenanceMode(nextEnabled)
    setWriteProtection(status)
  }

  const protectionLabel = writeProtection.envOverride
    ? '环境变量放行'
    : writeProtection.maintenanceMode
      ? '维护模式'
      : '只读保护'

  return (
    <div className="h-screen app-bg-primary app-text-primary flex flex-col">
      {/* Draggable title bar */}
      <div
        className="h-8 flex-shrink-0 flex items-center justify-center gap-1.5 border-b app-border"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        <img src={logoSrc} alt="" className="w-8 h-8 select-none pointer-events-none" />
        <span className="text-sm app-text-secondary select-none font-medium">Qclaw</span>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <nav className="w-[160px] flex-shrink-0 border-r app-border flex flex-col py-2 px-2">
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {COMMAND_CENTER_NAV_GROUPS.filter((group) => group.id !== 'system').map((group) => (
              <section key={group.id} className="space-y-1">
                <div className="px-3 text-[11px] font-semibold uppercase tracking-normal app-text-muted">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const meta = getNavItemMeta(item.id)
                    const active = !NON_HIGHLIGHT_NAV_ITEM_IDS.has(item.id) && isActive(meta.to)
                    const className = `flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm no-underline transition-colors ${
                      active
                        ? 'bg-[var(--mantine-color-brand-light)] text-[var(--mantine-color-brand-light-color)]'
                        : 'app-text-muted hover:app-text-secondary hover:app-bg-tertiary'
                    }`

                    return (
                      <Tooltip
                        key={item.id}
                        label={meta.tooltip || item.label}
                        position="right"
                        withArrow
                        multiline
                        maw={260}
                        disabled={!meta.tooltip}
                      >
                        <Link to={meta.to} className={className}>
                          {meta.icon || <span className="w-4 h-4 flex-shrink-0" />}
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        </Link>
                      </Tooltip>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
          <div className="mt-auto pt-2 border-t app-border">
            <div className="mb-2 rounded-lg border app-border px-2.5 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium app-text-secondary">{protectionLabel}</span>
                <span
                  className={`h-2 w-2 rounded-full ${
                    writeProtection.enabled ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </div>
              <button
                type="button"
                onClick={() => void handleToggleMaintenanceMode()}
                disabled={writeProtection.envOverride}
                className="mt-2 w-full rounded-md border app-border bg-transparent px-2 py-1.5 text-xs app-text-secondary hover:app-bg-tertiary disabled:opacity-60"
              >
                {writeProtection.envOverride
                  ? '环境变量已放行'
                  : writeProtection.maintenanceMode
                    ? '退出维护模式'
                    : '进入维护模式'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <NavLink
                to="/settings"
                end={false}
                className={`flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 rounded-lg text-sm no-underline transition-colors ${
                  location.pathname.startsWith('/settings')
                    ? 'bg-[var(--mantine-color-brand-light)] text-[var(--mantine-color-brand-light-color)]'
                    : 'app-text-muted hover:app-text-secondary hover:app-bg-tertiary'
                }`}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>设置</span>
              </NavLink>
              {updateState.hasUpdate && (
                <button
                  type="button"
                  onClick={() => openConfirmDialog()}
                  className="inline-flex shrink-0 items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors border-0 outline-none focus:outline-none focus-visible:outline-none appearance-none bg-[var(--mantine-primary-color-filled)] text-[var(--mantine-primary-color-contrast)] hover:bg-[var(--mantine-primary-color-filled-hover)]"
                >
                  新版本
                </button>
              )}
            </div>
          </div>
        </nav>

        {/* Content */}
        <main className="flex-1 min-h-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
