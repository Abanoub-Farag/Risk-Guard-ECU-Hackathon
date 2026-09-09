import { describe, expect, it } from 'vitest'
import { validateBiometrics } from '../utils/biometrics'

describe('Biometric Sanity Guardrails & Cross-Field BP Validation', () => {
  describe('Valid Biometrics', () => {
    it('accepts standard blood pressure within range (120/80)', () => {
      const result = validateBiometrics(120, 80, 95.5)
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual({})
    })

    it('accepts boundary systolic (50) and diastolic (30) when systolic > diastolic (e.g. 55/35)', () => {
      const result = validateBiometrics(55, 35)
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual({})
    })

    it('accepts upper boundary values (280/160)', () => {
      const result = validateBiometrics(280, 160)
      expect(result.isValid).toBe(true)
    })

    it('accepts null/undefined optional glucose', () => {
      expect(validateBiometrics(120, 80, null).isValid).toBe(true)
      expect(validateBiometrics(120, 80, undefined).isValid).toBe(true)
    })

    it('accepts glucose with up to 2 decimal places (e.g. 104.25)', () => {
      const result = validateBiometrics(120, 80, 104.25)
      expect(result.isValid).toBe(true)
    })
  })

  describe('Blood Pressure Range Violations', () => {
    it('rejects systolic below 50', () => {
      const result = validateBiometrics(45, 40)
      expect(result.isValid).toBe(false)
      expect(result.errors.systolic).toContain('between 50 and 300')
    })

    it('rejects systolic above 300', () => {
      const result = validateBiometrics(305, 80)
      expect(result.isValid).toBe(false)
      expect(result.errors.systolic).toContain('between 50 and 300')
    })

    it('rejects diastolic below 30', () => {
      const result = validateBiometrics(120, 25)
      expect(result.isValid).toBe(false)
      expect(result.errors.diastolic).toContain('between 30 and 200')
    })

    it('rejects diastolic above 200', () => {
      const result = validateBiometrics(220, 205)
      expect(result.isValid).toBe(false)
      expect(result.errors.diastolic).toContain('between 30 and 200')
    })

    it('rejects missing or NaN systolic/diastolic', () => {
      expect(validateBiometrics(null, 80).isValid).toBe(false)
      expect(validateBiometrics(120, null).isValid).toBe(false)
      expect(validateBiometrics(NaN, 80).isValid).toBe(false)
    })
  })

  describe('Cross-Field Validation (Systolic vs Diastolic)', () => {
    it('rejects when systolic is equal to diastolic (100 == 100)', () => {
      const result = validateBiometrics(100, 100)
      expect(result.isValid).toBe(false)
      expect(result.errors.bloodPressure).toContain('strictly greater than')
    })

    it('rejects when systolic is less than diastolic (80 < 120)', () => {
      const result = validateBiometrics(80, 120)
      expect(result.isValid).toBe(false)
      expect(result.errors.bloodPressure).toContain('strictly greater than')
    })

    it('passes when systolic is strictly greater than diastolic (121 > 80)', () => {
      const result = validateBiometrics(121, 80)
      expect(result.isValid).toBe(true)
      expect(result.errors.bloodPressure).toBeUndefined()
    })
  })

  describe('Glucose Guardrails', () => {
    it('rejects glucose <= 0', () => {
      const zeroResult = validateBiometrics(120, 80, 0)
      expect(zeroResult.isValid).toBe(false)
      expect(zeroResult.errors.glucose).toContain('greater than 0')

      const negResult = validateBiometrics(120, 80, -5)
      expect(negResult.isValid).toBe(false)
      expect(negResult.errors.glucose).toContain('greater than 0')
    })

    it('rejects glucose with more than 2 decimal places (e.g. 100.123)', () => {
      const result = validateBiometrics(120, 80, 100.123)
      expect(result.isValid).toBe(false)
      expect(result.errors.glucose).toContain('at most 2 decimal places')
    })
  })
})
