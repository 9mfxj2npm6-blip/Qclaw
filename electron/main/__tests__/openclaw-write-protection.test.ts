import { describe, expect, it } from 'vitest'
import {
  buildOpenClawWriteProtectionBlockedResult,
  getOpenClawWriteProtectionStatus,
  guardOpenClawMutation,
  isOpenClawWriteProtectionEnabled,
  OPENCLAW_WRITE_PROTECTION_ENV,
  setOpenClawMaintenanceMode,
} from '../openclaw-write-protection'

describe('openclaw write protection', () => {
  it('is enabled by default', () => {
    setOpenClawMaintenanceMode(false)
    expect(isOpenClawWriteProtectionEnabled({})).toBe(true)
  })

  it('can be disabled explicitly for local advanced use', () => {
    setOpenClawMaintenanceMode(false)
    expect(isOpenClawWriteProtectionEnabled({ [OPENCLAW_WRITE_PROTECTION_ENV]: 'off' })).toBe(false)
    expect(isOpenClawWriteProtectionEnabled({ [OPENCLAW_WRITE_PROTECTION_ENV]: 'allow-writes' })).toBe(false)
  })

  it('can be disabled for the current run through maintenance mode', () => {
    setOpenClawMaintenanceMode(false)
    expect(getOpenClawWriteProtectionStatus({})).toMatchObject({
      enabled: true,
      maintenanceMode: false,
      envOverride: false,
    })

    expect(setOpenClawMaintenanceMode(true)).toMatchObject({
      enabled: false,
      maintenanceMode: true,
      envOverride: false,
    })
    expect(isOpenClawWriteProtectionEnabled({})).toBe(false)

    setOpenClawMaintenanceMode(false)
  })

  it('blocks mutations without running the action when protection is enabled', () => {
    setOpenClawMaintenanceMode(false)
    let ran = false
    const result = guardOpenClawMutation('openclaw:config:apply-patch', () => {
      ran = true
      return { ok: true }
    }, {})

    expect(ran).toBe(false)
    expect(result).toMatchObject({
      ok: false,
      code: 1,
      errorCode: 'openclaw_write_protection_enabled',
      blocked: true,
      protectedBy: 'openclaw-write-protection',
      operation: 'openclaw:config:apply-patch',
    })
  })

  it('uses a clear message for blocked OpenClaw writes', () => {
    setOpenClawMaintenanceMode(false)
    const result = buildOpenClawWriteProtectionBlockedResult('plugins:install')
    expect(result.stderr).toContain('OpenClaw 只读保护已开启')
    expect(result.stderr).toContain('避免覆盖或打乱你现有的 OpenClaw 数据')
  })
})
