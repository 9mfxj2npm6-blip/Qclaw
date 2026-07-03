import { describe, expect, it } from 'vitest'
import {
  COMMAND_CENTER_NAV_GROUPS,
  buildCommandCenterViewModel,
} from '../command-center-state'
import { createDefaultOpenClawRuntimeReconcileStore } from '../gateway-runtime-reconcile-state'

describe('command center state', () => {
  it('builds five actionable status cards from read-only snapshots', () => {
    const model = buildCommandCenterViewModel({
      gatewayRunning: true,
      runtimeStore: createDefaultOpenClawRuntimeReconcileStore(),
      config: {
        models: {
          providers: [{ id: 'openai', enabled: true, apiKey: 'set' }],
        },
      },
      modelStatus: {
        defaultModel: 'openai/gpt-5.4-pro',
      },
      backupRoot: {
        displayRootDirectory: '/Users/wait/OpenClaw Backups',
      },
    })

    expect(model.statusCards.map((card) => card.key)).toEqual([
      'gateway',
      'service',
      'plugins',
      'models',
      'backup',
    ])
    expect(model.statusCards.find((card) => card.key === 'gateway')).toMatchObject({
      tone: 'ok',
      value: '在线',
      actionLabel: '打开 / 重启',
    })
    expect(model.statusCards.find((card) => card.key === 'models')).toMatchObject({
      tone: 'ok',
      value: 'openai/gpt-5.4-pro',
      actionLabel: '切换默认',
    })
  })

  it('marks plugin drift as confirmation required and never automatic', () => {
    const runtimeStore = createDefaultOpenClawRuntimeReconcileStore()
    runtimeStore.runtime.stateCode = 'blocked'
    runtimeStore.runtime.blockingReason = 'provider_plugin_not_ready'
    runtimeStore.runtime.lastReconcileSummary = '插件版本漂移'

    const model = buildCommandCenterViewModel({
      gatewayRunning: true,
      runtimeStore,
      config: {},
      modelStatus: null,
      backupRoot: null,
    })

    const pluginRepair = model.repairs.find((repair) => repair.id === 'plugin-drift')
    expect(pluginRepair).toMatchObject({
      risk: 'confirmation-required',
      actionLabel: '查看差异',
      requiresConfirmation: true,
    })
    expect(model.repairs.filter((repair) => repair.risk === 'automatic').map((repair) => repair.id)).not.toContain('plugin-drift')
  })

  it('allows gateway restart as an automatic safe repair only when gateway is stopped', () => {
    const model = buildCommandCenterViewModel({
      gatewayRunning: false,
      runtimeStore: createDefaultOpenClawRuntimeReconcileStore(),
      config: {},
      modelStatus: null,
      backupRoot: null,
    })

    expect(model.repairs.find((repair) => repair.id === 'gateway-restart')).toMatchObject({
      risk: 'automatic',
      title: 'Gateway 未响应时自动重启',
      requiresConfirmation: false,
    })
  })

  it('does not offer gateway restart while gateway state is unknown', () => {
    const model = buildCommandCenterViewModel({
      gatewayRunning: null,
      runtimeStore: createDefaultOpenClawRuntimeReconcileStore(),
      config: {},
      modelStatus: null,
      backupRoot: null,
    })

    expect(model.repairs.map((repair) => repair.id)).not.toContain('gateway-restart')
  })

  it('exposes confirmation metadata for service writes', () => {
    const runtimeStore = createDefaultOpenClawRuntimeReconcileStore()
    runtimeStore.runtime.stateCode = 'blocked'
    runtimeStore.runtime.blockingReason = 'service_generation_stale'

    const model = buildCommandCenterViewModel({
      gatewayRunning: true,
      runtimeStore,
      config: {},
      modelStatus: null,
      backupRoot: null,
    })

    const serviceRepair = model.repairs.find((repair) => repair.id === 'service-repair')
    expect(serviceRepair).toMatchObject({
      risk: 'confirmation-required',
      requiresConfirmation: true,
      confirmationTitle: '确认服务修复',
    })
  })

  it('resolves default model from nested status data', () => {
    const model = buildCommandCenterViewModel({
      gatewayRunning: true,
      runtimeStore: createDefaultOpenClawRuntimeReconcileStore(),
      config: {},
      modelStatus: { ok: true, data: { agents: { main: { primary: { model: 'anthropic/claude' } } } } },
      backupRoot: null,
    })

    expect(model.miniAiWorkbench.defaultModel).toBe('anthropic/claude')
  })

  it('detects enabled model providers from array, object, and legacy config shapes', () => {
    const cases = [
      { models: { providers: [{ id: 'openai', apiKey: 'set' }] } },
      { models: { providers: { openai: { enabled: true } } } },
      { models: { openai: { baseUrl: 'https://example.com' } } },
    ]

    for (const config of cases) {
      const model = buildCommandCenterViewModel({
        gatewayRunning: true,
        runtimeStore: createDefaultOpenClawRuntimeReconcileStore(),
        config,
        modelStatus: null,
        backupRoot: null,
      })
      expect(model.miniAiWorkbench.providerEnabled).toBe(true)
    }
  })

  it('defines navigation grouped by domain', () => {
    expect(COMMAND_CENTER_NAV_GROUPS.map((group) => group.label)).toEqual([
      '总览',
      'AI 使用',
      'OpenClaw 运维',
      '数据保护',
      '系统',
    ])
    expect(COMMAND_CENTER_NAV_GROUPS.flatMap((group) => group.items.map((item) => item.label))).toEqual(
      expect.arrayContaining(['指挥台', '聊天', '模型', 'Skills', '渠道', '服务', 'Gateway', '插件', '日志', '备份', '配置差异', '恢复', '设置'])
    )
  })
})
