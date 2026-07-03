import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { CommandCenterView } from '../components/command-center/CommandCenterView'
import {
  buildCommandCenterViewModel,
  type CommandCenterStatusKey,
} from '../shared/command-center-state'
import {
  createDefaultOpenClawRuntimeReconcileStore,
  type OpenClawRuntimeReconcileStore,
} from '../shared/gateway-runtime-reconcile-state'

type CommandCenterApi = Partial<typeof window.api>

interface CommandCenterSnapshot {
  gatewayRunning: boolean | null
  runtimeStore: OpenClawRuntimeReconcileStore
  config: unknown
  modelStatus: unknown
  backupRoot: { displayRootDirectory?: string | null } | null
}

function createFallbackSnapshot(): CommandCenterSnapshot {
  return {
    gatewayRunning: null,
    runtimeStore: createDefaultOpenClawRuntimeReconcileStore(),
    config: {},
    modelStatus: null,
    backupRoot: null,
  }
}

async function readCommandCenterSnapshots(api: CommandCenterApi | undefined): Promise<CommandCenterSnapshot> {
  const fallback = createFallbackSnapshot()

  const [
    gatewayHealthResult,
    runtimeStoreResult,
    configResult,
    modelStatusResult,
    backupRootResult,
  ] = await Promise.allSettled([
    api?.gatewayHealth?.(),
    api?.getOpenClawRuntimeReconcileState?.(),
    api?.readConfig?.(),
    readModelStatusSnapshot(api),
    api?.getOpenClawBackupRoot?.(),
  ])

  return {
    gatewayRunning: gatewayHealthResult.status === 'fulfilled'
      && typeof gatewayHealthResult.value?.running === 'boolean'
      ? gatewayHealthResult.value.running
      : fallback.gatewayRunning,
    runtimeStore: runtimeStoreResult.status === 'fulfilled' && runtimeStoreResult.value
      ? runtimeStoreResult.value
      : fallback.runtimeStore,
    config: configResult.status === 'fulfilled' && configResult.value
      ? configResult.value
      : fallback.config,
    modelStatus: modelStatusResult.status === 'fulfilled'
      ? modelStatusResult.value
      : fallback.modelStatus,
    backupRoot: backupRootResult.status === 'fulfilled' && backupRootResult.value
      ? backupRootResult.value
      : fallback.backupRoot,
  }
}

async function readModelStatusSnapshot(api: CommandCenterApi | undefined): Promise<unknown> {
  if (!api) return null

  if (typeof api.getModelStatus === 'function') {
    const status = await api.getModelStatus().catch(() => null)
    if (isUsefulModelStatus(status)) {
      return status
    }
  }

  if (typeof api.getModelCapabilities === 'function') {
    return api.getModelCapabilities().catch(() => null)
  }

  return null
}

function isUsefulModelStatus(status: unknown): boolean {
  if (!status || typeof status !== 'object') {
    return false
  }

  const statusRecord = status as { ok?: unknown; data?: unknown }
  return statusRecord.ok !== false || statusRecord.data !== undefined
}

function getConfirmationMessage(repairId: string): string {
  switch (repairId) {
    case 'plugin-drift':
      return '确认插件修复：需要你确认后再执行写入或插件变更，请前往渠道页面查看差异。'
    case 'service-repair':
      return '确认服务修复：需要你确认后再重新生成服务配置，请前往设置页面处理。'
    case 'default-model-config':
      return '确认默认模型写入：需要你确认后再保存默认模型，请先在模型页面选择。'
    default:
      return '此操作需要你确认后再执行，Command Center 不会直接写入 OpenClaw 数据。'
  }
}

export default function CommandCenter() {
  const navigate = useNavigate()
  const mountedRef = useRef(false)
  const snapshotRequestIdRef = useRef(0)
  const [snapshot, setSnapshot] = useState<CommandCenterSnapshot>(() => createFallbackSnapshot())
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null)

  const loadSnapshots = useCallback(async () => {
    if (!mountedRef.current) return

    const requestId = snapshotRequestIdRef.current + 1
    snapshotRequestIdRef.current = requestId

    setLoading(true)
    setErrorMessage(null)

    try {
      const loaded = await readCommandCenterSnapshots(window.api)
      if (!mountedRef.current || snapshotRequestIdRef.current !== requestId) return
      setSnapshot(loaded)
    } catch (error) {
      if (!mountedRef.current || snapshotRequestIdRef.current !== requestId) return
      setSnapshot(createFallbackSnapshot())
      setErrorMessage(error instanceof Error ? error.message : 'Command Center 快照读取失败。')
    } finally {
      if (!mountedRef.current || snapshotRequestIdRef.current !== requestId) return
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      snapshotRequestIdRef.current += 1
    }
  }, [])

  useEffect(() => {
    void loadSnapshots()
  }, [loadSnapshots])

  const model = useMemo(() => buildCommandCenterViewModel(snapshot), [snapshot])

  const handleStatusAction = useCallback((key: CommandCenterStatusKey) => {
    setConfirmationMessage(null)

    switch (key) {
      case 'gateway':
      case 'service':
        void loadSnapshots()
        return
      case 'plugins':
        navigate('/channels')
        return
      case 'models':
        navigate('/models')
        return
      case 'backup':
        navigate('/settings')
        return
    }
  }, [loadSnapshots, navigate])

  const handleRepairAction = useCallback(async (repairId: string) => {
    if (repairId === 'gateway-restart') {
      setConfirmationMessage(null)
      setErrorMessage(null)
      setLoading(true)

      try {
        await window.api?.ensureGatewayRunning?.()
      } catch (error) {
        if (!mountedRef.current) return
        setErrorMessage(error instanceof Error ? error.message : 'Gateway 自动重启失败。')
      } finally {
        await loadSnapshots()
      }
      return
    }

    setConfirmationMessage(getConfirmationMessage(repairId))
  }, [loadSnapshots])

  const handleMiniAiAction = useCallback(() => {
    setConfirmationMessage(null)
    navigate(model.miniAiWorkbench.defaultModel && model.miniAiWorkbench.providerEnabled ? '/chat' : '/models')
  }, [model.miniAiWorkbench.defaultModel, model.miniAiWorkbench.providerEnabled, navigate])

  return (
    <div className="flex h-full min-h-0 flex-col">
      {(loading || errorMessage || confirmationMessage) && (
        <div className="flex flex-wrap items-center gap-2 px-4 pt-4 text-xs">
          {loading && (
            <span className="rounded border app-border app-bg-inset px-2 py-1 app-text-muted">
              正在刷新 Command Center 快照...
            </span>
          )}
          {errorMessage && (
            <span role="alert" className="rounded border border-[var(--mantine-color-red-5)] px-2 py-1 app-text-warning">
              {errorMessage}
            </span>
          )}
          {confirmationMessage && (
            <span role="status" className="rounded border border-[var(--mantine-color-yellow-4)] px-2 py-1 app-text-warning">
              {confirmationMessage}
            </span>
          )}
        </div>
      )}
      <CommandCenterView
        model={model}
        onMiniAiAction={handleMiniAiAction}
        onRepairAction={handleRepairAction}
        onStatusAction={handleStatusAction}
      />
    </div>
  )
}
