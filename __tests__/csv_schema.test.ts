import { describe, it, expect } from 'vitest'
import { analyzeCsvHeaders, normalizeHeaderString, detectDelimiter } from '@/lib/csv-schema'

describe('CSV Schema Detection Engine', () => {
  it('should normalize header strings removing BOM, trimming spaces, and lowercasing', () => {
    expect(normalizeHeaderString('\uFEFF Content ')).toBe('content')
    expect(normalizeHeaderString(' Product Name ')).toBe('product_name')
    expect(normalizeHeaderString('UNIT-PRICE')).toBe('unit_price')
  })

  it('should detect delimiter correctly (comma vs semicolon)', () => {
    expect(detectDelimiter('content,channel\nValue 1,Web')).toBe(',')
    expect(detectDelimiter('Product;Price;Category;Stock\niPhone;999;Electronics;50')).toBe(';')
  })

  it('should detect CUSTOMER_FEEDBACK schema for content,channel headers', () => {
    const analysis = analyzeCsvHeaders(['content', 'channel'])
    expect(analysis.datasetType).toBe('CUSTOMER_FEEDBACK')
    expect(analysis.detectedFeedbackColumn).toBe('content')
    expect(analysis.detectedChannelColumn).toBe('channel')
  })

  it('should detect CUSTOMER_FEEDBACK schema for Content,Channel with BOM & spaces', () => {
    const analysis = analyzeCsvHeaders(['\uFEFF Content ', ' Channel '])
    expect(analysis.datasetType).toBe('CUSTOMER_FEEDBACK')
    expect(analysis.detectedFeedbackColumn).toBe('Content')
    expect(analysis.detectedChannelColumn).toBe('Channel')
  })

  it('should detect CUSTOMER_FEEDBACK schema for feedback synonym', () => {
    const analysis = analyzeCsvHeaders(['feedback', 'customer'])
    expect(analysis.datasetType).toBe('CUSTOMER_FEEDBACK')
    expect(analysis.detectedFeedbackColumn).toBe('feedback')
  })

  it('should detect CUSTOMER_FEEDBACK schema for review synonym', () => {
    const analysis = analyzeCsvHeaders(['review'])
    expect(analysis.datasetType).toBe('CUSTOMER_FEEDBACK')
    expect(analysis.detectedFeedbackColumn).toBe('review')
  })

  it('should detect ECOMMERCE_PRODUCT schema for Product,Price,Category,Stock headers', () => {
    const analysis = analyzeCsvHeaders(['Product', 'Price', 'Category', 'Stock'])
    expect(analysis.datasetType).toBe('ECOMMERCE_PRODUCT')
    expect(analysis.detectedProductColumn).toBe('Product')
    expect(analysis.detectedPriceColumn).toBe('Price')
    expect(analysis.detectedCategoryColumn).toBe('Category')
    expect(analysis.detectedStockColumn).toBe('Stock')
  })

  it('should detect ECOMMERCE_PRODUCT schema for product_name, price, quantity headers', () => {
    const analysis = analyzeCsvHeaders(['product_name', 'price', 'quantity'])
    expect(analysis.datasetType).toBe('ECOMMERCE_PRODUCT')
    expect(analysis.detectedProductColumn).toBe('product_name')
    expect(analysis.detectedPriceColumn).toBe('price')
    expect(analysis.detectedStockColumn).toBe('quantity')
  })

  it('should return UNSUPPORTED with raw headers for invalid/unknown CSV headers', () => {
    const analysis = analyzeCsvHeaders(['invalid_col', 'random_id', 'unknown_field'])
    expect(analysis.datasetType).toBe('UNSUPPORTED')
    expect(analysis.rawHeaders).toEqual(['invalid_col', 'random_id', 'unknown_field'])
  })
})
