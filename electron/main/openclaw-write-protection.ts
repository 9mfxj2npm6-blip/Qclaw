export const OPENCLAW_WRITE_PROTECTION_ENV = 'QCLAW_OPENCLAW_WRITE_PROTECTION'

const DISABLED_VALUES = new Set(['0', 'false', 'off', 'disabled', 'allow-writes'])

export function isOpenClawWriteProtectionEnabled(
  env: Record<string, string | undefined> = process.env
): boolean {
  const rawValue = String(env[OPENCLAW_WRITE_PROTECTION_ENV] || '').trim().toLowerCase()
  return !DISABLED_VALUES.has(rawValue)
}

export function buildOpenClawWriteProtectionBlockedResult(operation: string) {
  const normalizedOperation = String(operation || '').trim() || 'unknown-openclaw-write'
  const message =
    `OpenClaw 只读保护已开启，已阻止 ${normalizedOperation}。` +
    ` 为避免覆盖或打乱你现有的 OpenClaw 数据，默认不会执行写入、安装、修复、删除、恢复或升级操作。`

  return {
    ok: false,
    stdout: '',
    stderr: message,
    code: 1,
    message,
    errorCode: 'openclaw_write_protection_enabled',
    blocked: true,
    protectedBy: 'openclaw-write-protection',
    operation: normalizedOperation,
  }
}

export function guardOpenClawMutation<T>(
  operation: string,
  action: () => T | Promise<T>,
  env?: Record<string, string | undefined>
): T | Promise<T> | ReturnType<typeof buildOpenClawWriteProtectionBlockedResult> {
  if (isOpenClawWriteProtectionEnabled(env)) {
    return buildOpenClawWriteProtectionBlockedResult(operation)
  }

  return action()
}
