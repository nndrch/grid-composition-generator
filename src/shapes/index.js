import { quarterCirclePath, squarePath, trianglePath, circlePath } from './built-in.js';

const registry = new Map();

registry.set('builtin:quarterCircle', {
  id:      'builtin:quarterCircle',
  name:    'Quarter Circle',
  type:    'builtin',
  pathFn:  (w, h, step) => quarterCirclePath(w, h, step),
});

registry.set('builtin:square', {
  id:      'builtin:square',
  name:    'Square',
  type:    'builtin',
  pathFn:  (w, h) => squarePath(w, h),
});

registry.set('builtin:triangle', {
  id:      'builtin:triangle',
  name:    'Triangle',
  type:    'builtin',
  pathFn:  (w, h, step) => trianglePath(w, h, step),
});

registry.set('builtin:circle', {
  id:      'builtin:circle',
  name:    'Circle',
  type:    'builtin',
  pathFn:  (w, h) => circlePath(w, h),
});

export function getShape(id) {
  return registry.get(id) ?? null;
}

export function getAllShapes() {
  return [...registry.values()];
}

export function getBuiltinShapes() {
  return [...registry.values()].filter(s => s.type === 'builtin');
}

export function getCustomShapes() {
  return [...registry.values()].filter(s => s.type === 'custom');
}

export function registerCustomShape(entry) {
  registry.set(entry.id, entry);
}

export function removeCustomShape(id) {
  registry.delete(id);
}

export { registry };
