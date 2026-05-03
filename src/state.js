const state = {
  aspectWidth:  1,
  aspectHeight: 1,
  showGrid: false,

  cols: 8,
  colWaveform:  'locked',
  colMaxWeight: 4,
  colPeak:      0.5,

  rows: 8,
  rowWaveform:  'locked',
  rowMaxWeight: 4,
  rowPeak:      0.5,

  _colSizes: [],
  _rowSizes: [],

  modules: [
    {
      id:           'mod_1',
      shapeId:      'builtin:quarterCircle',
      fgColor:      '#000000',
      bgColor:      '#e63946',
      strokeColor:  null,
      strokeWeight: 0,
      weight:       3,
    },
    {
      id:           'mod_2',
      shapeId:      'builtin:triangle',
      fgColor:      '#1d3557',
      bgColor:      '#a8dadc',
      strokeColor:  null,
      strokeWeight: 0,
      weight:       2,
    },
  ],

  rotationEnabled: true,
  noiseScale:      0.4,
  symmetry:        'none',
  grammarEnabled:  false,
  grammar:         {},

  _noiseSeed: 0,
  _grid:      null,
};

export default state;
