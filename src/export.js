export function exportSVG() {
  const svg = document.getElementById('canvas-svg').cloneNode(true);
  svg.querySelector('#grid-overlay')?.remove();
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  const xml = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([xml], { type: 'image/svg+xml' });
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: 'composition.svg',
  });
  a.click();
  URL.revokeObjectURL(a.href);
}
