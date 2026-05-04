export function prepareSVGString() {
  const svg = document.getElementById('canvas-svg').cloneNode(true);
  svg.querySelector('#grid-overlay')?.remove();
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  return new XMLSerializer().serializeToString(svg);
}

export function exportSVG() {
  const xml = prepareSVGString();
  const blob = new Blob([xml], { type: 'image/svg+xml' });
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: 'composition.svg',
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function copySVGToClipboard() {
  const xml = prepareSVGString();
  await navigator.clipboard.writeText(xml);
}

export async function exportPNG(svgString, width, aspectW, aspectH) {
  const height = Math.round(width * aspectH / aspectW);
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url  = URL.createObjectURL(blob);

  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch {
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(img, 0, 0, width, height);

  URL.revokeObjectURL(url);

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}
