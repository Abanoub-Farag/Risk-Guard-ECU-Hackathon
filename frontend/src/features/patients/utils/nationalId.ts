export const EGYPTIAN_GOVERNORATES: Record<string, { en: string; ar: string }> = {
  '01': { en: 'Cairo', ar: 'القاهرة' },
  '02': { en: 'Alexandria', ar: 'الإسكندرية' },
  '03': { en: 'Port Said', ar: 'بورسعيد' },
  '04': { en: 'Suez', ar: 'السويس' },
  '11': { en: 'Damietta', ar: 'دمياط' },
  '12': { en: 'Dakahlia', ar: 'الدقهلية' },
  '13': { en: 'Ash Sharqia', ar: 'الشرقية' },
  '14': { en: 'Kaliobeya', ar: 'القليوبية' },
  '15': { en: 'Kafr El Sheikh', ar: 'كفر الشيخ' },
  '16': { en: 'Gharbia', ar: 'الغربية' },
  '17': { en: 'Monoufia', ar: 'المنوفية' },
  '18': { en: 'El Beheira', ar: 'البحيرة' },
  '19': { en: 'Ismailia', ar: 'الإسماعيلية' },
  '21': { en: 'Giza', ar: 'الجيزة' },
  '22': { en: 'Beni Suef', ar: 'بني سويف' },
  '23': { en: 'Faiyum', ar: 'الفيوم' },
  '24': { en: 'Minya', ar: 'المنيا' },
  '25': { en: 'Asyut', ar: 'أسيوط' },
  '26': { en: 'Sohag', ar: 'سوهاج' },
  '27': { en: 'Qena', ar: 'قنا' },
  '28': { en: 'Aswan', ar: 'أسوان' },
  '29': { en: 'Luxor', ar: 'الأقصر' },
  '31': { en: 'Red Sea', ar: 'البحر الأحمر' },
  '32': { en: 'New Valley', ar: 'الوادي الجديد' },
  '33': { en: 'Matrouh', ar: 'مطروح' },
  '34': { en: 'North Sinai', ar: 'شمال سيناء' },
  '35': { en: 'South Sinai', ar: 'جنوب سيناء' },
  '88': { en: 'Born Abroad', ar: 'خارج الجمهورية' },
}

export interface ParsedNationalId {
  isValid: boolean
  error?: string
  birthDate?: Date
  birthDateFormatted?: string
  governorateCode?: string
  governorate?: string
  gender?: 'Male' | 'Female'
  age?: number
}

export const isLeapYear = (year: number): boolean => {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

export const getDaysInMonth = (year: number, month: number): number => {
  const daysMap = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return daysMap[month - 1] ?? 0
}

export const parseEgyptianNationalId = (
  nationalId: string,
  currentDate: Date = new Date()
): ParsedNationalId => {
  if (!nationalId || typeof nationalId !== 'string') {
    return { isValid: false, error: 'National ID is required' }
  }

  const clean = nationalId.trim()

  if (!/^\d+$/.test(clean)) {
    return { isValid: false, error: 'National ID must contain only digits' }
  }

  if (clean.length !== 14) {
    return {
      isValid: false,
      error: `National ID must be exactly 14 digits (currently ${clean.length})`,
    }
  }

  const centuryDigit = clean[0]
  if (centuryDigit !== '2' && centuryDigit !== '3') {
    return {
      isValid: false,
      error: `Invalid century digit '${centuryDigit}'. First digit must be 2 (1900–1999) or 3 (2000–2099)`,
    }
  }
  const centuryBase = centuryDigit === '2' ? 1900 : 2000

  const yy = parseInt(clean.substring(1, 3), 10)
  const mm = parseInt(clean.substring(3, 5), 10)
  const dd = parseInt(clean.substring(5, 7), 10)
  const year = centuryBase + yy

  if (mm < 1 || mm > 12) {
    return {
      isValid: false,
      error: `Invalid birth month '${String(mm).padStart(2, '0')}'. Month must be between 01 and 12`,
    }
  }

  const maxDays = getDaysInMonth(year, mm)
  if (dd < 1 || dd > maxDays) {
    return {
      isValid: false,
      error: `Invalid day '${String(dd).padStart(2, '0')}' for ${year}-${String(mm).padStart(2, '0')}`,
    }
  }

  const birthDate = new Date(Date.UTC(year, mm - 1, dd))
  const todayUtc = new Date(
    Date.UTC(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate()
    )
  )

  if (birthDate > todayUtc) {
    return {
      isValid: false,
      error: `Birth date (${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}) cannot be in the future`,
    }
  }

  const govCode = clean.substring(7, 9)
  const govInfo = EGYPTIAN_GOVERNORATES[govCode]
  if (!govInfo) {
    return {
      isValid: false,
      error: `Unrecognized Egyptian governorate code '${govCode}'`,
    }
  }

  const genderDigit = parseInt(clean[12], 10)
  const gender: 'Male' | 'Female' = genderDigit % 2 !== 0 ? 'Male' : 'Female'

  let age = currentDate.getFullYear() - year
  const monthDiff = currentDate.getMonth() - (mm - 1)
  if (monthDiff < 0 || (monthDiff === 0 && currentDate.getDate() < dd)) {
    age--
  }

  const birthDateFormatted = `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`

  return {
    isValid: true,
    birthDate,
    birthDateFormatted,
    governorateCode: govCode,
    governorate: govInfo.en,
    gender,
    age,
  }
}

export const cleanNationalId = (input: string): string => {
  return input.replace(/\D/g, '').slice(0, 14)
}
