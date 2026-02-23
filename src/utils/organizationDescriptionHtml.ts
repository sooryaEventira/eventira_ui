/** Decode HTML entities (e.g. &lt; → <) so tags can be rendered. */
export function decodeHtmlEntities(html: string): string {
  if (!html) return '';
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, '\u00A0');
}

/**
 * Backend may send description wrapped in syntax-highlight markup (hljs-tag, hljs-name spans)
 * with entity-encoded tags (&lt;, &gt;) inside. Parse and read textContent to get clean HTML.
 */
export function extractHtmlFromHighlightedDescription(description: string): string {
  const raw = (description || '').trim();
  if (!raw) return '';
  if (typeof document === 'undefined') return raw;
  if (!raw.includes('hljs-')) return raw;
  const div = document.createElement('div');
  div.innerHTML = raw;
  const extracted = (div.textContent || div.innerText || '').trim();
  return extracted || raw;
}

/** Get clean HTML for display or for the edit form (strip hljs wrapper, decode entities). */
export function getDescriptionHtml(description: string): string {
  const afterHighlight = extractHtmlFromHighlightedDescription(description);
  const raw = (afterHighlight || '').trim();
  if (!raw) return '';
  if (raw.includes('&lt;') || raw.includes('&gt;') || raw.includes('&amp;')) {
    return decodeHtmlEntities(raw);
  }
  return raw;
}

/**
 * Strip inline color from HTML so table/tooltip can use one consistent text color.
 * Removes color (and color-related) from style attributes so create vs edit content looks the same.
 */
export function stripInlineColor(html: string): string {
  if (!html || !html.includes('style=')) return html;
  return html.replace(
    /\s*style\s*=\s*["']([^"']*)["']/gi,
    (_match, styleContent: string) => {
      const withoutColor = styleContent
        .replace(/\s*color\s*:\s*[^;]+(?:\s*!important)?\s*;?/gi, '')
        .replace(/\s*;\s*;+/g, ';')
        .trim()
        .replace(/^;\s*|;\s*$/g, '');
      if (!withoutColor) return '';
      return ` style="${withoutColor}"`;
    }
  );
}
