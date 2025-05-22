import { describe, expect, test } from 'vitest';
import { getTextTypeFromContent } from './fileProcessing';

describe('getTextTypeFromContentType', () => {
  test.each([
    ['', 'text'],
    ['<html></html>', 'html'],
    ['<html>Hello</html>', 'html'],
    ['<div class="test">Hello</div>', 'html'],
    ['<div   class="test"  >Hello</div>', 'html'],
    ['<div class="test" id="test">Hello</div>', 'html'],
    ['<div class="test" id="test" data-test="test">Hello</div>', 'html'],
    // only return html if content has start and end tags
    ['<img />', 'text'],
  ])('should return %s as %s', (input, expected) => {
    expect(getTextTypeFromContent(input)).toBe(expected);
  });
});
