import { describe, expect, it } from 'vitest'

const fs = process.getBuiltinModule('node:fs') as typeof import('node:fs')
const path = process.getBuiltinModule('node:path') as typeof import('node:path')

describe('App dashboard routes', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8')

  it('routes the dashboard index to CommandCenter', () => {
    expect(source).toContain("import CommandCenter from './pages/CommandCenter'")
    expect(source).toMatch(/<Route\s+index\s+element=\{<CommandCenter\s*\/>\}\s*\/>/)
  })

  it('does not keep old Dashboard index state plumbing', () => {
    expect(source).not.toContain('DashboardEntrySnapshot')
    expect(source).not.toContain('dashboardEntrySnapshot')
    expect(source).not.toContain('setDashboardEntrySnapshot')
    expect(source).not.toContain('updateCenterOpen')
    expect(source).not.toContain('setUpdateCenterOpen')
    expect(source).not.toContain('pendingOpenUpdateCenter')
    expect(source).not.toContain('setPendingOpenUpdateCenter')
  })
})
