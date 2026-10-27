import { describe, expect, it } from 'vitest'
import { arrowAppearance, arrowheadGeometry, normalizeColor, parseTextFormatting, textAppearance } from './appearance'
import { estimateLabelHeight, estimateTextSize, groupLabelLayout } from '../layout/sizes'

describe('diagram appearance', () => {
  it('normalizes hex colours and rejects CSS or URLs', () => {
    expect(normalizeColor(' #AbC ')).toBe('#aabbcc')
    expect(normalizeColor('#DC2626')).toBe('#dc2626')
    for (const value of [undefined, 123, '', 'red', '#abcd', 'url(https://example.com)', '#fff;strokeWidth=99', 'var(--color)']) {
      expect(normalizeColor(value)).toBeUndefined()
    }
  })

  it('keeps old diagrams visually unchanged and handles malformed appearance safely', () => {
    expect(arrowAppearance()).toEqual({ color: '#545b64', width: 1.5 })
    expect(arrowAppearance({ strokeColor: '#F00', strokeWidth: 4.5 })).toEqual({ color: '#ff0000', width: 4.5 })
    for (const strokeWidth of [NaN, Infinity, -1, 0, 0.1, 13, 100000]) {
      expect(arrowAppearance({ strokeWidth, strokeColor: 'url(x)' })).toEqual({ color: '#545b64', width: 1.5 })
    }
    expect(parseTextFormatting({ bold: 'true', underline: 1, textColor: 'url(x)' })).toEqual({})
    expect(parseTextFormatting({ bold: false, underline: true, textColor: '#FFF' })).toEqual({ bold: false, underline: true, textColor: '#ffffff' })
    expect(textAppearance()).toEqual({ color: '#18181b', fontWeight: 400, textDecoration: 'none' })
    expect(textAppearance({ bold: true, underline: true, textColor: '#f00' })).toEqual({ color: '#ff0000', fontWeight: 700, textDecoration: 'underline' })
    expect(textAppearance({}, '#8c4fff').color).toBe('#8c4fff')
  })

  it('leaves padding around arrowheads even at maximum stroke thickness', () => {
    for (const width of [0.5, 1.5, 4, 12]) {
      const head = arrowheadGeometry(width)
      expect(head.refX + width / 2).toBeLessThan(head.size)
      expect(head.refY).toBe(head.size / 2)
      expect(head.path).not.toMatch(/NaN|Infinity/)
    }
    expect(arrowheadGeometry(12).size).toBeGreaterThan(arrowheadGeometry(1.5).size)
  })

  it('reserves extra room for bold labels before the DOM has measured them', () => {
    expect(estimateLabelHeight('123456789012345', true)).toBeGreaterThan(estimateLabelHeight('123456789012345'))
    expect(estimateTextSize('Important', 18, true).width).toBeGreaterThan(estimateTextSize('Important', 18).width)
    expect(groupLabelLayout('Important group', false, undefined, true).minWidth).toBeGreaterThan(groupLabelLayout('Important group', false).minWidth)
  })
})
