import { describe, expect, it } from 'vitest'

import { calibrationCrop, describeOffset, toCalibration } from './model'

const raw = {
  variety_id: 'v1',
  variety_name: 'Bisi-18',
  commodity_name: 'Jagung',
  offset_days: -6,
  applied_offset_days: -3.6,
  n_observations: 3,
  residual_sd: 2.1,
}

describe('toCalibration', () => {
  it('carries both the raw and the applied offset', () => {
    const calibration = toCalibration(raw)
    expect(calibration.offsetDays).toBe(-6)
    expect(calibration.appliedOffsetDays).toBe(-3.6)
    expect(calibration.nObservations).toBe(3)
  })
})

describe('calibrationCrop', () => {
  it('names the commodity and the variety together', () => {
    expect(calibrationCrop(toCalibration(raw))).toBe('Jagung Bisi-18')
  })

  it('falls back to whichever half the server could name', () => {
    expect(calibrationCrop(toCalibration({ ...raw, commodity_name: '' }))).toBe('Bisi-18')
    expect(calibrationCrop(toCalibration({ ...raw, variety_name: '' }))).toBe('Jagung')
  })

  it('never renders an empty label', () => {
    expect(calibrationCrop(toCalibration({ ...raw, commodity_name: '', variety_name: '' })))
      .toBe('Varietas ini')
  })
})

describe('describeOffset', () => {
  it('reads a negative offset as the crop coming in earlier', () => {
    expect(describeOffset(-3.6)).toBe('3,6 hari lebih cepat')
  })

  it('reads a positive offset as the crop coming in later', () => {
    expect(describeOffset(2.4)).toBe('2,4 hari lebih lambat')
  })

  it('drops the decimal past ten days, which no handful of harvests supports', () => {
    expect(describeOffset(-12.4)).toBe('12 hari lebih cepat')
  })

  it('says almost nothing rather than nothing', () => {
    // "0 hari" reads as the model having found no difference at all, which is
    // a different claim from having found a very small one.
    expect(describeOffset(0.2)).toBe('kurang dari 1 hari')
    expect(describeOffset(0)).toBe('kurang dari 1 hari')
  })
})
