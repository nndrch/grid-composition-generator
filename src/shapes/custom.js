let _uidSeq = 0;

function sanitize(doc) {
  doc.querySelectorAll('script').forEach(el => el.remove());
  doc.querySelectorAll('*').forEach(el => {
    for (const attr of [...el.attributes]) {
      if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
    }
  });
}

function extractViewBox(svgEl) {
  const vb = svgEl.getAttribute('viewBox');
  if (vb) {
    const parts = vb.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0 && parts.every(n => !isNaN(n))) {
      return { w: parts[2], h: parts[3] };
    }
  }
  const w = parseFloat(svgEl.getAttribute('width'));
  const h = parseFloat(svgEl.getAttribute('height'));
  if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) return { w, h };
  return { w: 100, h: 100 };
}

export function ingestSvg(text, filename) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'image/svg+xml');

  if (doc.querySelector('parsererror')) throw new Error('Invalid SVG: parse error');

  const root = doc.documentElement;
  if (root.tagName.toLowerCase() !== 'svg') throw new Error('Root element is not <svg>');

  sanitize(doc);

  const viewBox = extractViewBox(root);
  const svgContent = root.innerHTML;
  const name = (filename.replace(/\.svg$/i, '').replace(/[-_]/g, ' ') || 'Custom Shape').trim();
  const id = `custom:${++_uidSeq}_${Date.now()}`;

  return { id, name, type: 'custom', svgContent, viewBox };
}
