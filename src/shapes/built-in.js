// Pre-oriented path variants — no rotation transforms.
// Steps: 0=TL, 1=TR, 2=BR, 3=BL

export function quarterCirclePath(w, h, step) {
  switch (step) {
    case 0: return `M 0,0 L ${w},0 A ${w},${h} 0 0 1 0,${h} Z`;
    case 1: return `M ${w},0 L 0,0 A ${w},${h} 0 0 0 ${w},${h} Z`;
    case 2: return `M ${w},${h} L 0,${h} A ${w},${h} 0 0 1 ${w},0 Z`;
    case 3: return `M 0,${h} L ${w},${h} A ${w},${h} 0 0 0 0,0 Z`;
  }
}

export function squarePath(w, h) {
  return `M 0,0 L ${w},0 L ${w},${h} L 0,${h} Z`;
}

export function trianglePath(w, h, step) {
  switch (step) {
    case 0: return `M 0,0 L ${w},0 L 0,${h} Z`;
    case 1: return `M 0,0 L ${w},0 L ${w},${h} Z`;
    case 2: return `M ${w},0 L ${w},${h} L 0,${h} Z`;
    case 3: return `M 0,0 L ${w},${h} L 0,${h} Z`;
  }
}
