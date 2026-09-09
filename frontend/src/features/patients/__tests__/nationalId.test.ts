import { describe, expect, it } from 'vitest'
import {
  cleanNationalId,
  isLeapYear,
  parseEgyptianNationalId,
} from '../utils/nationalId'

describe('Egyptian National ID Parser & Validator', () => {
  const mockCurrentDate = new Date('2026-09-09T00:00:00Z')

  describe('Valid National IDs', () => {
    it('parses valid century 2 (1985-05-14) Cairo male national ID', () => {
      // Century 2, Year 85, Month 05, Day 14, Gov 01 (Cairo), Seq 123 (odd = Male), Check 5
      const id = '28505140101235'
      const result = parseEgyptianNationalId(id, mockCurrentDate)

      expect(result.isValid).toBe(true)
      expect(result.birthDateFormatted).toBe('1985-05-14')
      expect(result.governorate).toBe('Cairo')
      expect(result.governorateCode).toBe('01')
      expect(result.gender).toBe('Male')
      expect(result.age).toBe(41)
    })

    it('parses valid century 3 (2001-11-20) Alexandria female national ID', () => {
      // Century 3, Year 01, Month 11, Day 20, Gov 02 (Alexandria), Seq 044 (even = Female), Check 9
      const id = '30111200200449'
      const result = parseEgyptianNationalId(id, mockCurrentDate)

      expect(result.isValid).toBe(true)
      expect(result.birthDateFormatted).toBe('2001-11-20')
      expect(result.governorate).toBe('Alexandria')
      expect(result.gender).toBe('Female')
      expect(result.age).toBe(24)
    })

    it('parses valid Giza born abroad (code 88)', () => {
      const id = '29001018800114'
      const result = parseEgyptianNationalId(id, mockCurrentDate)

      expect(result.isValid).toBe(true)
      expect(result.governorate).toBe('Born Abroad')
      expect(result.birthDateFormatted).toBe('1990-01-01')
    })
  })

  describe('Invalid Lengths and Characters', () => {
    it('rejects ID with less than 14 digits', () => {
      const result = parseEgyptianNationalId('2850514010123', mockCurrentDate)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('14 digits')
    })

    it('rejects ID with more than 14 digits', () => {
      const result = parseEgyptianNationalId('285051401012345', mockCurrentDate)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('14 digits')
    })

    it('rejects empty or whitespace string', () => {
      expect(parseEgyptianNationalId('', mockCurrentDate).isValid).toBe(false)
      expect(parseEgyptianNationalId('   ', mockCurrentDate).isValid).toBe(false)
    })

    it('rejects non-numeric characters', () => {
      const result = parseEgyptianNationalId('2850514010123A', mockCurrentDate)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('only digits')
    })
  })

  describe('Century Digit Validation', () => {
    it('rejects century digit 1', () => {
      const result = parseEgyptianNationalId('18505140101235', mockCurrentDate)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('century digit')
    })

    it('rejects century digit 4', () => {
      const result = parseEgyptianNationalId('48505140101235', mockCurrentDate)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('century digit')
    })
  })

  describe('Calendar Date & Future Date Validation', () => {
    it('rejects invalid month (00 or 13)', () => {
      expect(parseEgyptianNationalId('28500140101235', mockCurrentDate).isValid).toBe(false)
      expect(parseEgyptianNationalId('28513140101235', mockCurrentDate).isValid).toBe(false)
    })

    it('rejects invalid day (32 in January or 31 in April)', () => {
      // Jan 32
      expect(parseEgyptianNationalId('28501320101235', mockCurrentDate).isValid).toBe(false)
      // April 31
      expect(parseEgyptianNationalId('28504310101235', mockCurrentDate).isValid).toBe(false)
    })

    it('rejects future birth date', () => {
      // 2027-01-01 is after 2026-09-09
      const result = parseEgyptianNationalId('32701010101235', mockCurrentDate)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('future')
    })
  })

  describe('Leap Year Handling', () => {
    it('correctly identifies leap years', () => {
      expect(isLeapYear(2000)).toBe(true) // Century divisible by 400
      expect(isLeapYear(1900)).toBe(false) // Century not divisible by 400
      expect(isLeapYear(2004)).toBe(true)
      expect(isLeapYear(2001)).toBe(false)
    })

    it('accepts Feb 29 for leap year 2000', () => {
      // Century 3, Year 00 (2000), Month 02, Day 29
      const result = parseEgyptianNationalId('30002290101235', mockCurrentDate)
      expect(result.isValid).toBe(true)
      expect(result.birthDateFormatted).toBe('2000-02-29')
    })

    it('accepts Feb 29 for leap year 2004', () => {
      const result = parseEgyptianNationalId('30402290101235', mockCurrentDate)
      expect(result.isValid).toBe(true)
      expect(result.birthDateFormatted).toBe('2004-02-29')
    })

    it('rejects Feb 29 for non-leap year 1900', () => {
      // Century 2, Year 00 (1900), Month 02, Day 29 -> 1900 is NOT a leap year
      const result = parseEgyptianNationalId('20002290101235', mockCurrentDate)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Invalid day')
    })

    it('rejects Feb 29 for non-leap year 1999', () => {
      const result = parseEgyptianNationalId('29902290101235', mockCurrentDate)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Invalid day')
    })
  })

  describe('Governorate Validation', () => {
    it('rejects invalid governorate code (e.g. 00 or 99)', () => {
      const result = parseEgyptianNationalId('28505149901235', mockCurrentDate)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('governorate code')
    })
  })

  describe('Helper cleanNationalId', () => {
    it('strips non-digits and truncates to 14 characters', () => {
      expect(cleanNationalId('285-0514-010123-5-extra')).toBe('28505140101235')
      expect(cleanNationalId('abc1234')).toBe('1234')
    })
  })
})
