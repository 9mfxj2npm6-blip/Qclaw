// @vitest-environment happy-dom

import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { CommandCenterView } from '../CommandCenterView'
import type { CommandCenterViewModel } from '../../../shared/command-center-state'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function createModel(overrides: Partial<CommandCenterViewModel> = {}): CommandCenterViewModel {
  return {
    statusCards: [
      { key: 'gateway', label: 'Gateway', value: '在线', detail: '本机 Gateway 正在响应。', tone: 'ok', actionLabel: '打开 / 重启' },
      { key: 'service', label: '服务', value: '就绪', detail: '服务配置已同步。', tone: 'ok', actionLabel: '检查服务' },
      { key: 'plugins', label: '插件', value: '需确认', detail: '检测到插件状态漂移。', tone: 'warning', actionLabel: '查看差异' },
      { key: 'models', label: '模型', value: 'gpt-4.1-mini', detail: '已有模型供应商配置。', tone: 'ok', actionLabel: '切换默认' },
      { key: 'backup', label: '备份', value: '/Users/wait/OpenClaw/backups', detail: '备份目录已就绪。', tone: 'ok', actionLabel: '打开备份' },
    ],
    repairs: [
      {
        id: 'gateway-restart',
        title: 'Gateway 未响应时自动重启',
        description: '仅在 Gateway 停止响应时尝试重启本机 Gateway。',
        actionLabel: '自动重启',
        risk: 'automatic',
        requiresConfirmation: false,
      },
      {
        id: 'plugin-drift',
        title: '插件版本漂移需要确认',
        description: '检测到供应商插件状态与期望不一致。',
        actionLabel: '查看差异',
        risk: 'confirmation-required',
        requiresConfirmation: true,
        confirmationTitle: '确认插件修复',
      },
    ],
    navGroups: [{ id: 'overview', label: '总览', items: [{ id: 'command-center', label: '指挥台' }] }],
    contextPanels: [
      { id: 'runtime', title: '运行状态', summary: '运行时状态可继续检查。', tone: 'ok' },
      { id: 'model', title: '默认模型', summary: 'gpt-4.1-mini', tone: 'ok' },
    ],
    miniAiWorkbench: {
      defaultModel: 'gpt-4.1-mini',
      providerEnabled: true,
      actionLabel: '开始聊天',
    },
    ...overrides,
  }
}

function renderView(model = createModel()) {
  return renderToStaticMarkup(
    <CommandCenterView
      model={model}
      onMiniAiAction={() => undefined}
      onRepairAction={() => undefined}
      onStatusAction={() => undefined}
    />
  )
}

function renderInteractiveView({
  model = createModel(),
  onMiniAiAction = () => undefined,
  onRepairAction = () => undefined,
  onStatusAction = () => undefined,
}: {
  model?: CommandCenterViewModel
  onMiniAiAction?: () => void
  onRepairAction?: (id: string) => void
  onStatusAction?: (key: CommandCenterViewModel['statusCards'][number]['key']) => void
}) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root: Root = createRoot(container)

  act(() => {
    root.render(
      <CommandCenterView
        model={model}
        onMiniAiAction={onMiniAiAction}
        onRepairAction={onRepairAction}
        onStatusAction={onStatusAction}
      />
    )
  })

  return {
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

describe('CommandCenterView', () => {
  it('renders status cards and key command center sections from the model', () => {
    const html = renderView()

    expect(html).toContain('Command Center')
    expect(html).toContain('Gateway')
    expect(html).toContain('服务')
    expect(html).toContain('插件')
    expect(html).toContain('模型')
    expect(html).toContain('备份')
    expect(html).toContain('修复队列')
    expect(html).toContain('上下文')
    expect(html).toContain('Mini AI Workbench')
    expect(html).toContain('运行时状态可继续检查。')
  })

  it('shows confirmation-required repairs distinctly from automatic repairs', () => {
    const html = renderView()

    expect(html).toContain('自动执行')
    expect(html).toContain('可直接尝试自动修复')
    expect(html).toContain('需要确认')
    expect(html).toContain('确认插件修复')
    expect(html).toContain('执行前需要你确认，确认后才会修改数据或配置。')
  })

  it('invokes action callbacks through rendered buttons', () => {
    const onStatusAction = vi.fn()
    const onRepairAction = vi.fn()
    const onMiniAiAction = vi.fn()
    const view = renderInteractiveView({ onMiniAiAction, onRepairAction, onStatusAction })

    try {
      act(() => {
        getButtonByText(view.container, '打开 / 重启').click()
        getButtonByText(view.container, '自动重启').click()
        getButtonByText(view.container, '开始聊天').click()
      })

      expect(onStatusAction).toHaveBeenCalledWith('gateway')
      expect(onRepairAction).toHaveBeenCalledWith('gateway-restart')
      expect(onMiniAiAction).toHaveBeenCalledOnce()
    } finally {
      view.unmount()
    }
  })

  it('reflects missing mini AI model state', () => {
    const html = renderView(createModel({
      miniAiWorkbench: {
        defaultModel: null,
        providerEnabled: false,
        actionLabel: '选择模型',
      },
    }))

    expect(html).toContain('尚未选择默认模型')
    expect(html).toContain('供应商未启用')
    expect(html).toContain('选择模型')
  })
})
