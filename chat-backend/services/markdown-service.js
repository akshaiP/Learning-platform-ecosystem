// Utilities to normalize and sanitize AI text into renderer-friendly Markdown

function ensureBlankLinesAroundHeadings(text) {
  // Ensure a blank line before and after each heading line
  const lines = text.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isHeading = /^#{1,6} \S/.test(line);
    const prev = out.length > 0 ? out[out.length - 1] : '';
    if (isHeading) {
      if (prev && prev.trim() !== '') {
        out.push('');
      }
      out.push(line);
      const next = lines[i + 1] ?? '';
      if (next.trim() !== '') {
        out.push('');
      }
    } else {
      out.push(line);
    }
  }
  return out.join('\n');
}

function normalizeLists(text) {
  // Convert mixed bullets like "* item" or "• item" to "- item" and enforce spacing
  const lines = text.replace(/^[ \t]*[•*] +/gm, '- ').split('\n');
  const out = [];
  let inList = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isBullet = /^-\s+\S/.test(line);
    if (isBullet) {
      if (!inList) {
        // ensure blank line before list start
        const prev = out.length > 0 ? out[out.length - 1] : '';
        if (prev.trim() !== '') out.push('');
        inList = true;
      } else {
        // ensure a blank line between list items for renderers that require it
        const prev = out.length > 0 ? out[out.length - 1] : '';
        if (prev.trim() !== '') out.push('');
      }
      out.push(line);
      // if next line isn't another bullet, close list with a blank line
      const next = lines[i + 1] ?? '';
      if (!/^-\s+\S/.test(next)) {
        out.push('');
        inList = false;
      }
    } else {
      out.push(line);
      inList = false;
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

function closeUnclosedCodeFences(text) {
  const fenceCount = (text.match(/```/g) || []).length;
  if (fenceCount % 2 !== 0) {
    return text + '\n```';
  }
  return text;
}

function escapeDanglingAsterisks(text) {
  // Replace isolated asterisks that can break emphasis
  return text.replace(/(^|\s)\*(\s|$)/g, '$1\\*$2');
}

function trimExcessBlankLines(text) {
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

function normalizeHorizontalRules(text) {
  return text.replace(/\n[-_]{3,}\n/g, '\n\n---\n\n');
}

function sanitizeHtmlAngles(text) {
  // Prevent accidental HTML injection when renderer doesn't escape
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function normalizeMarkdown(text) {
  if (!text || typeof text !== 'string') return '';
  let t = text;
  t = closeUnclosedCodeFences(t);
  t = ensureBlankLinesAroundHeadings(t);
  t = normalizeLists(t);
  t = normalizeHorizontalRules(t);
  t = escapeDanglingAsterisks(t);
  t = trimExcessBlankLines(t);
  return t;
}

module.exports = {
  normalizeMarkdown,
  sanitizeHtmlAngles
};


