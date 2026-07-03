import type {
  CommandCenterContextPanel,
  CommandCenterRepair,
  CommandCenterStatusCard,
  CommandCenterStatusKey,
  CommandCenterTone,
  CommandCenterViewModel,
} from '../../shared/command-center-state'

interface CommandCenterViewProps {
  model: CommandCenterViewModel
  onStatusAction: (key: CommandCenterStatusKey) => void
  onRepairAction: (id: string) => void
  onMiniAiAction: () => void
}

const toneClasses: Record<CommandCenterTone, string> = {
  ok: 'border-[var(--app-text-success)] text-[var(--app-text-success)]',
  warning: 'border-[var(--mantine-color-yellow-4)] text-[var(--mantine-color-yellow-4)]',
  danger: 'border-[var(--mantine-color-red-5)] text-[var(--mantine-color-red-5)]',
  muted: 'border-[var(--app-border)] app-text-muted',
}

export function CommandCenterView({
  model,
  onStatusAction,
  onRepairAction,
  onMiniAiAction,
}: CommandCenterViewProps) {
  return (
    <section className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4 app-text-primary">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-normal app-text-muted">OpenClaw</p>
          <h1 className="text-xl font-semibold leading-tight">Command Center</h1>
        </div>
        <nav aria-label="Command center sections" className="flex flex-wrap gap-2">
          {model.navGroups.map((group) => (
            <div key={group.id} className="flex items-center gap-1 text-xs app-text-muted">
              <span className="font-medium app-text-secondary">{group.label}</span>
              <span>{group.items.map((item) => item.label).join(' / ')}</span>
            </div>
          ))}
        </nav>
      </header>

      <section aria-label="状态卡片" className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {model.statusCards.map((card) => (
          <StatusCard key={card.key} card={card} onAction={onStatusAction} />
        ))}
      </section>

      <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.9fr)]">
        <section className="min-w-0" aria-labelledby="command-center-repairs">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="command-center-repairs" className="text-sm font-semibold">
              修复队列
            </h2>
            <span className="text-xs app-text-muted">{model.repairs.length} 项</span>
          </div>
          <div className="space-y-2">
            {model.repairs.length > 0 ? (
              model.repairs.map((repair) => (
                <RepairRow key={repair.id} repair={repair} onAction={onRepairAction} />
              ))
            ) : (
              <p className="rounded-lg border app-border app-bg-inset px-3 py-2 text-sm app-text-secondary">
                当前没有待处理修复。
              </p>
            )}
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <section aria-labelledby="command-center-context">
            <h2 id="command-center-context" className="mb-3 text-sm font-semibold">
              上下文
            </h2>
            <div className="space-y-2">
              {model.contextPanels.map((panel) => (
                <ContextPanel key={panel.id} panel={panel} />
              ))}
            </div>
          </section>

          <section className="rounded-lg border app-border app-bg-secondary p-3" aria-labelledby="command-center-mini-ai">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="command-center-mini-ai" className="text-sm font-semibold">
                  Mini AI Workbench
                </h2>
                <p className="mt-1 text-xs app-text-muted">
                  {model.miniAiWorkbench.providerEnabled ? '供应商已启用' : '供应商未启用'}
                </p>
              </div>
              <span className={getPillClass(model.miniAiWorkbench.providerEnabled ? 'ok' : 'warning')}>
                {model.miniAiWorkbench.providerEnabled ? 'Ready' : 'Setup'}
              </span>
            </div>
            <div className="mt-3 rounded-lg border app-border app-bg-inset px-3 py-2">
              <p className="text-xs app-text-muted">默认模型</p>
              <p className="mt-1 break-words text-sm font-semibold">
                {model.miniAiWorkbench.defaultModel || '尚未选择默认模型'}
              </p>
            </div>
            <button
              type="button"
              className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-[var(--mantine-primary-color-filled)] px-3 py-2 text-sm font-medium text-[var(--mantine-primary-color-contrast)] transition-colors"
              onClick={onMiniAiAction}
            >
              {model.miniAiWorkbench.actionLabel}
            </button>
          </section>
        </aside>
      </div>
    </section>
  )
}

function StatusCard({
  card,
  onAction,
}: {
  card: CommandCenterStatusCard
  onAction: (key: CommandCenterStatusKey) => void
}) {
  return (
    <article className="rounded-lg border app-border app-bg-secondary p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium app-text-muted">{card.label}</p>
          <p className="mt-1 break-words text-lg font-semibold leading-tight">{card.value}</p>
        </div>
        <span className={getPillClass(card.tone)}>{getToneLabel(card.tone)}</span>
      </div>
      <p className="mt-2 min-h-9 text-xs leading-5 app-text-secondary">{card.detail}</p>
      <button
        type="button"
        className="mt-3 inline-flex w-full items-center justify-center rounded-lg border app-border px-2.5 py-1.5 text-xs font-medium app-text-primary transition-colors hover:border-[var(--app-hover-border)]"
        onClick={() => onAction(card.key)}
      >
        {card.actionLabel}
      </button>
    </article>
  )
}

function RepairRow({
  repair,
  onAction,
}: {
  repair: CommandCenterRepair
  onAction: (id: string) => void
}) {
  const confirmationRequired = repair.risk === 'confirmation-required' || repair.requiresConfirmation

  return (
    <article className="rounded-lg border app-border app-bg-inset p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{repair.title}</h3>
            <span className={getPillClass(confirmationRequired ? 'warning' : 'ok')}>
              {confirmationRequired ? '需要确认' : '自动执行'}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 app-text-secondary">{repair.description}</p>
          <p className={confirmationRequired ? 'mt-2 text-xs app-text-warning' : 'mt-2 text-xs app-text-muted'}>
            {confirmationRequired
              ? `${repair.confirmationTitle || '确认修复'}：执行前需要你确认，确认后才会修改数据或配置。`
              : '可直接尝试自动修复，不会在确认前写入用户数据。'}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex shrink-0 items-center justify-center rounded-lg border app-border px-3 py-1.5 text-xs font-medium app-text-primary transition-colors hover:border-[var(--app-hover-border)]"
          onClick={() => onAction(repair.id)}
        >
          {repair.actionLabel}
        </button>
      </div>
    </article>
  )
}

function ContextPanel({ panel }: { panel: CommandCenterContextPanel }) {
  return (
    <article className="rounded-lg border app-border app-bg-inset px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold app-text-secondary">{panel.title}</h3>
        <span className={getPillClass(panel.tone)}>{getToneLabel(panel.tone)}</span>
      </div>
      <p className="mt-1 text-xs leading-5 app-text-muted">{panel.summary}</p>
    </article>
  )
}

function getPillClass(tone: CommandCenterTone) {
  return `inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[11px] font-medium ${toneClasses[tone]}`
}

function getToneLabel(tone: CommandCenterTone) {
  switch (tone) {
    case 'ok':
      return 'OK'
    case 'warning':
      return 'Warn'
    case 'danger':
      return 'Risk'
    case 'muted':
      return 'Idle'
  }
}
