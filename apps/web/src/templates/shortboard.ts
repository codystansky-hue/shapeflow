import type { BoardDesignData } from '@shapeflow/shared';

/** Default shortboard template: ~6'0" x 18.5" x 2.25" */
export const shortboardTemplate: BoardDesignData = {
  formatVersion: 1,
  units: 'mm',
  symmetric: true,

  dimensions: {
    length: 1829, // 6'0"
    width: 470,   // ~18.5"
    thickness: 57, // ~2.25"
  },

  // Half-outline curve (one side, 0 = tail, max = nose)
  outline: {
    degree: 3,
    controlPoints: [
      [0, 50],       // tail
      [150, 95],     // tail hip
      [400, 180],    // wide point approach
      [700, 225],    // near wide point
      [915, 235],    // wide point (center-ish)
      [1200, 220],   // forward of wide point
      [1500, 170],   // front third
      [1700, 100],   // nose approach
      [1829, 30],    // nose
    ],
    knots: [0, 0, 0, 0, 0.15, 0.3, 0.5, 0.7, 0.85, 1, 1, 1, 1],
  },

  // Bottom rocker curve (side profile)
  rocker: {
    degree: 3,
    controlPoints: [
      [0, 12],       // tail kick
      [200, 4],      // tail flat
      [500, 1],      // center-tail
      [915, 0],      // flat spot (center)
      [1300, 3],     // nose start
      [1600, 18],    // nose curve
      [1829, 48],    // nose kick
    ],
    knots: [0, 0, 0, 0, 0.3, 0.6, 0.85, 1, 1, 1, 1],
  },

  // Deck rocker
  deckRocker: {
    degree: 3,
    controlPoints: [
      [0, 68],       // tail (rocker + thickness)
      [200, 60],
      [500, 57],
      [915, 57],     // center
      [1300, 60],
      [1600, 72],
      [1829, 90],    // nose
    ],
    knots: [0, 0, 0, 0, 0.3, 0.6, 0.85, 1, 1, 1, 1],
  },

  // Thickness distribution along length
  thickness: {
    degree: 3,
    controlPoints: [
      [0, 38],        // tail
      [300, 50],
      [600, 55],
      [915, 57],      // max thickness at center
      [1200, 54],
      [1500, 44],
      [1829, 20],     // nose
    ],
    knots: [0, 0, 0, 0, 0.3, 0.6, 0.85, 1, 1, 1, 1],
  },

  // Cross-sections at 25%, 50%, 75%
  crossSections: [
    {
      position: 0.25,
      curve: {
        degree: 3,
        controlPoints: [
          [0, 0],       // bottom center
          [60, -2],     // bottom rail
          [100, 5],     // rail apex
          [105, 30],    // upper rail
          [80, 48],     // deck shoulder
          [0, 50],      // deck center
        ],
        knots: [0, 0, 0, 0, 0.4, 0.7, 1, 1, 1, 1],
      },
    },
    {
      position: 0.5,
      curve: {
        degree: 3,
        controlPoints: [
          [0, 0],       // bottom center (slight concave)
          [80, -1],
          [150, 4],     // rail bottom
          [160, 30],    // rail
          [120, 55],    // deck shoulder
          [0, 57],      // deck center
        ],
        knots: [0, 0, 0, 0, 0.4, 0.7, 1, 1, 1, 1],
      },
    },
    {
      position: 0.75,
      curve: {
        degree: 3,
        controlPoints: [
          [0, 0],
          [50, -1],
          [110, 3],
          [115, 26],
          [85, 44],
          [0, 46],
        ],
        knots: [0, 0, 0, 0, 0.4, 0.7, 1, 1, 1, 1],
      },
    },
  ],

  fins: [
    { type: 'fcs2', position: [90, 0, 15], angle: 0, cant: 0, side: 'center' },
    { type: 'fcs2', position: [180, 130, 15], angle: 4, cant: 3, side: 'right' },
    { type: 'fcs2', position: [180, 130, 15], angle: 4, cant: 3, side: 'left' },
  ],

  computedVolume: 26.5,
};
