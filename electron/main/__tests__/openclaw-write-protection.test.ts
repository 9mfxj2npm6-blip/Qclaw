import { describe, expect, it } from 'vitest'
import {
  buildOpenClawWriteProtectionBlockedResult,
  guardOpenClawMutation,
  isOpenClawWriteProtectionEnabled,
  OPENCLAW_WRITE_PROTECTION_ENV,
} from '../openclaw-write-protection'

describe('openclaw write protection', () => {
  it('is enabled by default', () => {
    expect(isOpenClawWriteProtectionEnabled({})).toBe(true)
  })

  it('can be disabled explicitly for local advanced use', () => {
    expect(isOpenClawWriteProtectionEnabled({ [OPENCLAW_WRITE_PROTECTION_ENV]: 'off' })).toBe(false)
    expect(isOpenClawWriteProtectionEnabled({ [OPENCLAW_WRITE_PROTECTION_ENV]: 'allow-writes' })).toBe(false)
  })

  it('blocks mutations without running the action when protection is enabled', () => {
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
    const result = buildOpenClawWriteProtectionBlockedResult('plugins:install')
    expect(result.stderr).toContain('OpenClaw 只读保护已开启')
    expect(result.stderr).toContain('避免覆盖或打乱你现有的 OpenClaw 数据')
  })
})
