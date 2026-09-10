import { describe, expect, it } from 'vitest';
import { parseFeed, firstImage } from '../../src/lib/rss';

const mediumLikeRss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Test Feed</title>
    <item>
      <title><![CDATA[My First &amp; Best Post]]></title>
      <link>https://medium.com/@handle/first-post-abc123</link>
      <guid isPermaLink="false">https://medium.com/p/abc123</guid>
      <pubDate>Tue, 18 Aug 2026 10:00:00 GMT</pubDate>
      <description>Short description.</description>
      <content:encoded><![CDATA[<p>Full <strong>content</strong> here.</p><script>alert(1)</script>]]></content:encoded>
    </item>
    <item>
      <title>Second Post</title>
      <link>https://medium.com/@handle/second-post-def456</link>
      <guid>https://medium.com/p/def456</guid>
      <pubDate>Thu, 02 Jul 2026 09:30:00 GMT</pubDate>
      <description>Another description.</description>
    </item>
  </channel>
</rss>`;

const atomFeed = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Feed</title>
  <entry>
    <title>Atom Entry</title>
    <link href="https://blog.example.com/posts/1" rel="alternate"/>
    <id>urn:uuid:aaa-bbb</id>
    <published>2026-06-01T12:00:00Z</published>
    <content type="html">&lt;p&gt;atom body&lt;/p&gt;</content>
  </entry>
</feed>`;

describe('parseFeed', () => {
  it('parses RSS 2.0 with CDATA (Medium-style)', () => {
    const items = parseFeed(mediumLikeRss);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('My First & Best Post');
    expect(items[0].guid).toBe('https://medium.com/p/abc123');
    expect(items[0].link).toBe('https://medium.com/@handle/first-post-abc123');
    expect(items[0].publishedAt).toBe('2026-08-18T10:00:00.000Z');
    expect(items[0].contentHtml).toContain('<strong>content</strong>');
  });

  it('falls back to description when content:encoded is absent', () => {
    const items = parseFeed(mediumLikeRss);
    expect(items[1].contentHtml).toBe('Another description.');
  });

  it('parses Atom entries', () => {
    const items = parseFeed(atomFeed);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Atom Entry');
    expect(items[0].link).toBe('https://blog.example.com/posts/1');
    expect(items[0].guid).toBe('urn:uuid:aaa-bbb');
    expect(items[0].contentHtml).toContain('atom body');
  });

  it('returns [] for unrecognized input', () => {
    expect(parseFeed('<html><body>not a feed</body></html>')).toEqual([]);
    expect(parseFeed('')).toEqual([]);
  });

  it('skips items with no guid and no link', () => {
    const items = parseFeed(
      '<rss version="2.0"><channel><item><title>orphan</title></item></channel></rss>'
    );
    expect(items).toHaveLength(0);
  });
});

describe('firstImage', () => {
  it('finds the first https image source', () => {
    expect(firstImage('<p><img src="https://cdn.example.com/cover.png" alt="x"></p>')).toBe(
      'https://cdn.example.com/cover.png'
    );
  });

  it('ignores non-https images', () => {
    expect(firstImage('<img src="http://cdn.example.com/cover.png">')).toBeNull();
    expect(firstImage('<img src="data:image/png;base64,xxx">')).toBeNull();
    expect(firstImage('<p>no images</p>')).toBeNull();
  });
});
