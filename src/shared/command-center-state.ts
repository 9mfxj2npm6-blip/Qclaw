import type { OpenClawRuntimeReconcileStore } from './gateway-runtime-reconcile-state'

export type CommandCenterStatusKey = 'gateway' | 'service' | 'plugins' | 'models' | 'backup'
export type CommandCenterTone = 'ok' | 'warning' | 'danger' | 'muted'
export type CommandCenterRepairRisk = 'automatic' | 'confirmation-required'

export interface CommandCenterStatusCard {
  key: CommandCenterStatusKey
  label: string
  value: string
  detail: string
  tone: CommandCenterTone
  actionLabel: string
}

export interface CommandCenterRepair {
  id: string
  title: string
  description: string
  actionLabel: string
  risk: CommandCenterRepairRisk
  requiresConfirmation: boolean
  confirmationTitle?: string
}

export interface CommandCenterNavItem {
  id: string
  label: string
}

export interface CommandCenterNavGroup {
  id: string
  label: string
  items: CommandCenterNavItem[]
}

export interface CommandCenterContextPanel {
  id: string
  title: string
  summary: string
  tone: CommandCenterTone
}

export interface CommandCenterMiniAiWorkbench {
  defaultModel: string | null
  providerEnabled: boolean
  actionLabel: string
}

export interface CommandCenterInput {
  gatewayRunning: boolean | null
  runtimeStore: OpenClawRuntimeReconcileStore
  config: unknown
  modelStatus: unknown
  backupRoot: {
    displayRootDirectory?: string | null
  } | null
}

export interface CommandCenterViewModel {
  statusCards: CommandCenterStatusCard[]
  repairs: CommandCenterRepair[]
  navGroups: CommandCenterNavGroup[]
  contextPanels: CommandCenterContextPanel[]
  miniAiWorkbench: CommandCenterMiniAiWorkbench
}

export const COMMAND_CENTER_NAV_GROUPS: CommandCenterNavGroup[] = [
  {
    id: 'overview',
    label: '总览',
    items: [
      { id: 'command-center', label: '指挥台' },
      { id: 'chat', label: '聊天' },
    ],
  },
  {
    id: 'ai-usage',
    label: 'AI 使用',
    items: [
      { id: 'models', label: '模型' },
      { id: 'skills', label: 'Skills' },
      { id: 'channels', label: '渠道' },
    ],
  },
  {
    id: 'openclaw-ops',
    label: 'OpenClaw 运维',
    items: [
      { id: 'service', label: '服务' },
      { id: 'gateway', label: 'Gateway' },
      { id: 'plugins', label: '插件' },
      { id: 'logs', label: '日志' },
    ],
  },
  {
    id: 'data-protection',
    label: '数据保护',
    items: [
      { id: 'backup', label: '备份' },
      { id: 'config-diff', label: '配置差异' },
      { id: 'restore', label: '恢复' },
    ],
  },
  {
    id: 'system',
    label: '系统',
    items: [{ id: 'settings', label: '设置' }],
  },
]

export function buildCommandCenterViewModel(input: CommandCenterInput): CommandCenterViewModel {
  const defaultModel = resolveDefaultModel(input.modelStatus)
  const providerEnabled = hasEnabledModelProvider(input.config)
  const runtime = input.runtimeStore.runtime

  return {
    statusCards: [
      buildGatewayCard(input.gatewayRunning),
      buildServiceCard(input.runtimeStore),
      buildPluginsCard(input.runtimeStore),
      buildModelsCard(defaultModel, providerEnabled),
      buildBackupCard(input.backupRoot?.displayRootDirectory || null),
    ],
    repairs: buildRepairs(input),
    navGroups: COMMAND_CENTER_NAV_GROUPS,
    contextPanels: [
      {
        id: 'runtime',
        title: '运行状态',
        summary: runtime.lastReconcileSummary || getRuntimeSummary(input.runtimeStore),
        tone: getRuntimeTone(input.runtimeStore),
      },
      {
        id: 'model',
        title: '默认模型',
        summary: defaultModel || '尚未选择默认模型',
        tone: defaultModel ? 'ok' : 'warning',
      },
    ],
    miniAiWorkbench: {
      defaultModel,
      providerEnabled,
      actionLabel: defaultModel ? '开始聊天' : '选择模型',
    },
  }
}

function buildGatewayCard(gatewayRunning: boolean | null): CommandCenterStatusCard {
  if (gatewayRunning === null) {
    return {
      key: 'gateway',
      label: 'Gateway',
      value: '读取中',
      detail: '正在读取本机 Gateway 状态。',
      tone: 'muted',
      actionLabel: '打开 / 重启',
    }
  }

  return {
    key: 'gateway',
    label: 'Gateway',
    value: gatewayRunning ? '在线' : '离线',
    detail: gatewayRunning ? '本机 Gateway 正在响应。' : 'Gateway 当前未响应，可尝试自动重启。',
    tone: gatewayRunning ? 'ok' : 'danger',
    actionLabel: '打开 / 重启',
  }
}

function buildServiceCard(runtimeStore: OpenClawRuntimeReconcileStore): CommandCenterStatusCard {
  const runtime = runtimeStore.runtime
  const blockedByService = runtime.blockingReason === 'service_generation_stale'

  return {
    key: 'service',
    label: '服务',
    value: blockedByService ? '需修复' : getRuntimeValue(runtimeStore),
    detail: runtime.lastReconcileSummary || getRuntimeSummary(runtimeStore),
    tone: blockedByService ? 'warning' : getRuntimeTone(runtimeStore),
    actionLabel: blockedByService ? '修复服务' : '检查服务',
  }
}

function buildPluginsCard(runtimeStore: OpenClawRuntimeReconcileStore): CommandCenterStatusCard {
  const runtime = runtimeStore.runtime
  const pluginDrift = runtime.blockingReason === 'provider_plugin_not_ready'

  return {
    key: 'plugins',
    label: '插件',
    value: pluginDrift ? '需确认' : '已检查',
    detail: runtime.lastReconcileSummary || (pluginDrift ? '检测到插件状态漂移。' : '未发现插件阻塞。'),
    tone: pluginDrift ? 'warning' : 'ok',
    actionLabel: pluginDrift ? '查看差异' : '管理插件',
  }
}

function buildModelsCard(defaultModel: string | null, providerEnabled: boolean): CommandCenterStatusCard {
  return {
    key: 'models',
    label: '模型',
    value: defaultModel || '未设置',
    detail: providerEnabled ? '已有模型供应商配置。' : '尚未检测到启用的模型供应商。',
    tone: defaultModel || providerEnabled ? 'ok' : 'warning',
    actionLabel: '切换默认',
  }
}

function buildBackupCard(displayRootDirectory: string | null): CommandCenterStatusCard {
  return {
    key: 'backup',
    label: '备份',
    value: displayRootDirectory || '未配置',
    detail: displayRootDirectory ? '备份目录已就绪。' : '建议先配置备份目录。',
    tone: displayRootDirectory ? 'ok' : 'muted',
    actionLabel: displayRootDirectory ? '打开备份' : '设置备份',
  }
}

function buildRepairs(input: CommandCenterInput): CommandCenterRepair[] {
  const repairs: CommandCenterRepair[] = []
  const runtime = input.runtimeStore.runtime

  if (input.gatewayRunning === false) {
    repairs.push({
      id: 'gateway-restart',
      title: 'Gateway 未响应时自动重启',
      description: '仅在 Gateway 停止响应时尝试重启本机 Gateway。',
      actionLabel: '自动重启',
      risk: 'automatic',
      requiresConfirmation: false,
    })
  }

  if (runtime.blockingReason === 'provider_plugin_not_ready') {
    repairs.push({
      id: 'plugin-drift',
      title: '插件版本漂移需要确认',
      description: runtime.lastReconcileSummary || '检测到供应商插件状态与期望不一致。',
      actionLabel: '查看差异',
      risk: 'confirmation-required',
      requiresConfirmation: true,
      confirmationTitle: '确认插件修复',
    })
  }

  if (runtime.blockingReason === 'service_generation_stale') {
    repairs.push({
      id: 'service-repair',
      title: '服务配置需要重新生成',
      description: runtime.lastReconcileSummary || 'OpenClaw 服务配置已过期，需要确认后写入修复。',
      actionLabel: '确认修复',
      risk: 'confirmation-required',
      requiresConfirmation: true,
      confirmationTitle: '确认服务修复',
    })
  }

  return repairs
}

function getRuntimeValue(runtimeStore: OpenClawRuntimeReconcileStore): string {
  switch (runtimeStore.runtime.stateCode) {
    case 'ready':
      return '就绪'
    case 'degraded':
      return '需关注'
    case 'blocked':
      return '受阻'
    case 'in_progress':
      return '处理中'
    case 'pending':
      return '待处理'
    case 'idle':
      return '空闲'
  }
}

function getRuntimeTone(runtimeStore: OpenClawRuntimeReconcileStore): CommandCenterTone {
  switch (runtimeStore.runtime.stateCode) {
    case 'ready':
    case 'idle':
      return 'ok'
    case 'degraded':
    case 'pending':
    case 'in_progress':
      return 'warning'
    case 'blocked':
      return 'danger'
  }
}

function getRuntimeSummary(runtimeStore: OpenClawRuntimeReconcileStore): string {
  const runtime = runtimeStore.runtime
  if (runtime.blockingReason !== 'none') return `当前阻塞原因：${runtime.blockingReason}`
  if (runtime.stateCode === 'ready') return 'OpenClaw 运行状态已就绪。'
  return '未发现需要立即处理的 OpenClaw 运行阻塞。'
}

function resolveDefaultModel(modelStatus: unknown): string | null {
  const visited = new Set<unknown>()

  function walk(value: unknown): string | null {
    if (!value || typeof value !== 'object') return null
    if (visited.has(value)) return null
    visited.add(value)

    const record = value as Record<string, unknown>
    for (const key of ['defaultModel', 'resolvedDefault', 'model', 'activeModel']) {
      const candidate = record[key]
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
    }

    if (record.primary && typeof record.primary === 'object') {
      const primary = walk(record.primary)
      if (primary) return primary
    }

    if (record.data && typeof record.data === 'object') {
      const data = walk(record.data)
      if (data) return data
    }

    if (record.agents && typeof record.agents === 'object') {
      const agents = record.agents as Record<string, unknown>
      for (const agent of Object.values(agents)) {
        const agentModel = walk(agent)
        if (agentModel) return agentModel
      }
    }

    return null
  }

  return walk(modelStatus)
}

function hasEnabledModelProvider(config: unknown): boolean {
  if (!config || typeof config !== 'object') return false
  const root = config as Record<string, unknown>
  const models = root.models

  if (!models || typeof models !== 'object') return false
  const modelRecord = models as Record<string, unknown>
  const providers = modelRecord.providers

  if (Array.isArray(providers)) {
    return providers.some((provider) => isProviderEnabled(provider))
  }

  if (providers && typeof providers === 'object') {
    return Object.values(providers as Record<string, unknown>).some((provider) => isProviderEnabled(provider))
  }

  return Object.entries(modelRecord).some(([key, value]) => key !== 'defaultModel' && isProviderEnabled(value))
}

function isProviderEnabled(provider: unknown): boolean {
  if (!provider || typeof provider !== 'object') return false
  const record = provider as Record<string, unknown>
  if (record.enabled === false || record.disabled === true) return false
  if (record.apiKey || record.baseUrl || record.models || record.model) return true
  return record.enabled === true
}
