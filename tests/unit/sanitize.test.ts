import { describe, expect, it } from 'vitest';
import { sanitizeHtml, htmlToText } from '../../src/lib/sanitize';

describe('sanitizeHtml (blog syndication XSS defense — architecture §9/§13)', () => {
  it('removes script tags and their content', () => {
    const result = sanitizeHtml('<p>ok</p><script>alert(1)</script>');
    expect(result).toContain('ok');
    expect(result).not.toContain('script');
    expect(result).not.toContain('alert');
  });

  it('removes event-handler attributes', () => {
    const result = sanitizeHtml('<p onclick="evil()" onmouseover="evil()">text</p>');
    expect(result).toBe('<p>text</p>');
  });

  it('strips javascript: hrefs', () => {
    const result = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(result).not.toContain('javascript:');
    expect(result).toContain('click');
  });

  it('keeps safe https links and hardens them', () => {
    const result = sanitizeHtml('<a href="https://example.com/post">read</a>');
    expect(result).toBe(
      '<a href="https://example.com/post" rel="noopener noreferrer" target="_blank">read</a>'
    );
  });

  it('keeps https images but drops non-https or tracking payloads', () => {
    const result = sanitizeHtml(
      '<img src="https://cdn.example.com/a.png" onerror="evil()" alt="A"><img src="http://insecure.example.com/b.png">'
    );
    expect(result).toBe(
      '<img src="https://cdn.example.com/a.png" alt="A" loading="lazy" decoding="async">'
    );
  });

  it('drops disallowed tags while keeping their text', () => {
    const result = sanitizeHtml(
      '<div style="x">keep me</div><table><tr><td>cell</td></tr></table>'
    );
    expect(result).toContain('keep me');
    expect(result).not.toMatch(/<\/?(div|table|tr|td)/i);
  });

  it('removes iframe/object/embed subtrees entirely', () => {
    const result = sanitizeHtml(
      '<p>before</p><iframe src="https://evil.example.com"></iframe><p>after</p>'
    );
    expect(result).toBe('<p>before</p><p>after</p>');
  });

  it('removes HTML comments', () => {
    expect(sanitizeHtml('a<!-- hidden -->b')).toBe('ab');
  });

  it('keeps the allowed formatting vocabulary', () => {
    const input =
      '<h2>T</h2><pre><code>x=1</code></pre><ul><li>a</li></ul><blockquote>q</blockquote><strong>b</strong><em>i</em>';
    const result = sanitizeHtml(input);
    for (const tag of ['h2', 'pre', 'code', 'ul', 'li', 'blockquote', 'strong', 'em']) {
      expect(result).toContain(`<${tag}>`);
    }
  });
});

describe('htmlToText', () => {
  it('extracts plain text and decodes entities', () => {
    expect(htmlToText('<p>A &amp; B</p>\n<p>C</p>')).toBe('A & B C');
  });
});
