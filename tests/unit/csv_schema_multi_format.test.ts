import { describe, it, expect } from 'vitest'
import { analyzeCsvHeaders } from '../../src/lib/csv-schema'

describe('Multi-Format CSV Schema Detection Test Suite', () => {
  it('1. should detect and map "content" header format', () => {
    const analysis = analyzeCsvHeaders(['content', 'channel'])
    expect(analysis.datasetType).toBe('CUSTOMER_FEEDBACK')
    expect(analysis.detectedFeedbackColumn).toBe('content')
  })

  it('2. should detect and map "feedback" header format', () => {
    const analysis = analyzeCsvHeaders(['feedback', 'source'])
    expect(analysis.datasetType).toBe('CUSTOMER_FEEDBACK')
    expect(analysis.detectedFeedbackColumn).toBe('feedback')
  })

  it('3. should detect and map "review" header format', () => {
    const analysis = analyzeCsvHeaders(['Review', 'Rating'])
    expect(analysis.datasetType).toBe('CUSTOMER_FEEDBACK')
    expect(analysis.detectedFeedbackColumn).toBe('Review')
  })

  it('4. should detect and map "comment" header format', () => {
    const analysis = analyzeCsvHeaders(['Comment', 'User'])
    expect(analysis.datasetType).toBe('CUSTOMER_FEEDBACK')
    expect(analysis.detectedFeedbackColumn).toBe('Comment')
  })

  it('5. should detect and map "message" header format', () => {
    const analysis = analyzeCsvHeaders(['Message', 'Date'])
    expect(analysis.datasetType).toBe('CUSTOMER_FEEDBACK')
    expect(analysis.detectedFeedbackColumn).toBe('Message')
  })

  it('6. should detect and map "customer_feedback" header format', () => {
    const analysis = analyzeCsvHeaders(['Customer Feedback', 'Channel'])
    expect(analysis.datasetType).toBe('CUSTOMER_FEEDBACK')
    expect(analysis.detectedFeedbackColumn).toBe('Customer Feedback')
  })

  it('7. should return UNSUPPORTED for random unrecognized headers', () => {
    const analysis = analyzeCsvHeaders(['FooBar', 'Baz'])
    expect(analysis.datasetType).toBe('UNSUPPORTED')
    expect(analysis.detectedFeedbackColumn).toBeNull()
  })
})
