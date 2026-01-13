import { describe, it, expect } from 'vitest'
import {
  cronToHuman,
  cronToHumanVerbose,
  formatDuration,
  formatDate,
} from '../../cron/humanizer.js'

describe('cronToHuman', () => {
  it('converts common cron expressions', () => {
    expect(cronToHuman('0 9 * * *')).toContain('9')
    expect(cronToHuman('0 9 * * 1-5')).toMatch(/monday|weekday/i)
    expect(cronToHuman('* * * * *')).toMatch(/minute/i)
  })

  it('returns the original expression if parsing fails', () => {
    expect(cronToHuman('invalid')).toBe('invalid')
  })
})

describe('cronToHumanVerbose', () => {
  it('provides verbose descriptions', () => {
    const verbose = cronToHumanVerbose('0 9 * * 1-5')
    expect(verbose).toBeTruthy()
    expect(verbose.length).toBeGreaterThan(0)
  })

  it('returns the original expression if parsing fails', () => {
    expect(cronToHumanVerbose('invalid')).toBe('invalid')
  })
})

describe('formatDuration', () => {
  it('formats milliseconds', () => {
    expect(formatDuration(500)).toBe('500ms')
    expect(formatDuration(0)).toBe('0ms')
    expect(formatDuration(999)).toBe('999ms')
  })

  it('formats seconds', () => {
    expect(formatDuration(1000)).toBe('1s')
    expect(formatDuration(5000)).toBe('5s')
    expect(formatDuration(59000)).toBe('59s')
  })

  it('formats minutes and seconds', () => {
    expect(formatDuration(60000)).toBe('1m')
    expect(formatDuration(90000)).toBe('1m 30s')
    expect(formatDuration(120000)).toBe('2m')
    expect(formatDuration(150000)).toBe('2m 30s')
  })

  it('formats hours and minutes', () => {
    expect(formatDuration(3600000)).toBe('1h')
    expect(formatDuration(5400000)).toBe('1h 30m')
    expect(formatDuration(7200000)).toBe('2h')
  })
})

describe('formatDate', () => {
  it('returns a formatted string', () => {
    const date = new Date('2025-01-15T09:30:00')
    const formatted = formatDate(date)
    expect(formatted).toBeTruthy()
    expect(typeof formatted).toBe('string')
  })

  it('includes time components', () => {
    const date = new Date('2025-01-15T14:30:00')
    const formatted = formatDate(date)
    // Should contain some time indicator
    expect(formatted).toMatch(/\d/)
  })
})
