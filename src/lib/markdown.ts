// Tiny, dependency-free Markdown -> HTML converter.
//
// Used so users can paste a whole ".md" documentation file into a task
// description (like Jira) and have it render formatted. It intentionally
// emits only the HTML tags TipTap's StarterKit understands (headings,
// lists, blockquote, code, pre, hr, strong/em/del/code, links) so pasted
// Markdown round-trips cleanly into the rich-text editor.
//
// It is NOT a full CommonMark implementation — just the constructs we use
// in our user-story docs: headings, bold/italic/strike/code, ordered &
// unordered lists (incl. task lists), blockquotes, fenced code, links,
// horizontal rules and paragraphs.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Inline formatting on an already HTML-escaped string. We split on inline
// code spans so their contents are never reformatted, then format the rest.
function inline(s: string): string {
  return s
    .split(/(`[^`]+`)/g)
    .map((part) => {
      if (part.length >= 2 && part.startsWith('`') && part.endsWith('`')) {
        return `<code>${part.slice(1, -1)}</code>`;
      }
      let t = part;
      // Links [text](url)
      t = t.replace(
        /\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
        (_m, text, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`,
      );
      // Bold, then italic, then strikethrough
      t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      t = t.replace(/__([^_]+)__/g, '<strong>$1</strong>');
      t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      t = t.replace(/(^|[^\w])_([^_]+)_(?=[^\w]|$)/g, '$1<em>$2</em>');
      t = t.replace(/~~([^~]+)~~/g, '<del>$1</del>');
      return t;
    })
    .join('');
}

export function markdownToHtml(md: string): string {
  if (!md) return '';
  const lines = String(md).replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let para: string[] = [];
  let i = 0;

  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };
  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${inline(escapeHtml(para.join(' ')))}</p>`);
      para = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block ```lang ... ```
    const fence = line.match(/^\s*```(\w*)\s*$/);
    if (fence) {
      flushPara();
      closeList();
      const lang = fence[1];
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      out.push(
        `<pre><code${lang ? ` class="language-${lang}"` : ''}>${escapeHtml(buf.join('\n'))}</code></pre>`,
      );
      continue;
    }

    // Blank line -> paragraph / list boundary
    if (/^\s*$/.test(line)) {
      flushPara();
      closeList();
      i++;
      continue;
    }

    // Heading (# .. ######)
    const h = line.match(/^\s*(#{1,6})\s+(.*)$/);
    if (h) {
      flushPara();
      closeList();
      const level = h[1].length;
      out.push(`<h${level}>${inline(escapeHtml(h[2].trim()))}</h${level}>`);
      i++;
      continue;
    }

    // Horizontal rule (---, ***, ___)
    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flushPara();
      closeList();
      out.push('<hr>');
      i++;
      continue;
    }

    // Blockquote (collect consecutive > lines)
    if (/^\s*>\s?/.test(line)) {
      flushPara();
      closeList();
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>${inline(escapeHtml(buf.join(' ')))}</blockquote>`);
      continue;
    }

    // Unordered list item (- * +), incl. task lists [ ] / [x]
    const ul = line.match(/^\s*[-*+]\s+(.*)$/);
    if (ul) {
      flushPara();
      if (listType !== 'ul') {
        closeList();
        out.push('<ul>');
        listType = 'ul';
      }
      const item = ul[1].replace(/^\[( |x|X)\]\s+/, (_m, c) => (c === ' ' ? '☐ ' : '☑ '));
      out.push(`<li>${inline(escapeHtml(item))}</li>`);
      i++;
      continue;
    }

    // Ordered list item (1. 2. ...)
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ol) {
      flushPara();
      if (listType !== 'ol') {
        closeList();
        out.push('<ol>');
        listType = 'ol';
      }
      out.push(`<li>${inline(escapeHtml(ol[1]))}</li>`);
      i++;
      continue;
    }

    // Default: accumulate paragraph text
    closeList();
    para.push(line.trim());
    i++;
  }

  flushPara();
  closeList();
  return out.join('\n');
}

// Heuristic: does this plain text look like Markdown worth converting?
export function looksLikeMarkdown(text: string): boolean {
  if (!text) return false;
  return (
    /^\s{0,3}#{1,6}\s/m.test(text) || // headings
    /^\s*[-*+]\s+/m.test(text) || // bullet list
    /^\s*\d+\.\s+/m.test(text) || // ordered list
    /^\s*>\s+/m.test(text) || // blockquote
    /```/.test(text) || // fenced code
    /\*\*[^*\n]+\*\*/.test(text) || // bold
    /\[[^\]\n]+\]\([^)\n]+\)/.test(text) // link
  );
}

// Does a stored description already contain HTML markup (from the editor),
// or is it raw Markdown/plain text that should be converted before display?
export function isHtml(s: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(s);
}

// Prepare a stored description for dangerouslySetInnerHTML: pass HTML through,
// convert Markdown to HTML, leave plain text as-is (it renders fine).
export function descriptionToHtml(desc?: string | null): string {
  if (!desc) return '';
  if (isHtml(desc)) return desc;
  if (looksLikeMarkdown(desc)) return markdownToHtml(desc);
  return desc;
}
