/** NURBS curve definition - the fundamental building block */
export interface NURBSCurveData {
  degree: number;
  controlPoints: number[][]; // 2D: [x, y] or 3D: [x, y, z]
  knots: number[];
  weights?: number[]; // optional rational weights (default: all 1.0)
}

/** A cross-section at a specific position along the board */
export interface CrossSectionData {
  /** Position along the board length, normalized 0 (tail) to 1 (nose) */
  position: number;
  /** Cross-section curve in the Y-Z plane (half-section, mirrored) */
  curve: NURBSCurveData;
}

/** Fin plug definition */
export interface FinPlugData {
  type: 'fcs' | 'fcs2' | 'futures' | 'us-box' | 'generic';
  /** Position relative to board: [distFromTail, distFromCenter, depth] in mm */
  position: [number, number, number];
  /** Toe angle in degrees */
  angle: number;
  /** Cant angle in degrees */
  cant: number;
  side: 'left' | 'right' | 'center';
}

/** Board type categories */
export type BoardType =
  | 'shortboard'
  | 'longboard'
  | 'fish'
  | 'gun'
  | 'funboard'
  | 'foil'
  | 'sup'
  | 'windsurf'
  | 'kite'
  | 'other';

/** Units for dimensions */
export type Units = 'mm' | 'inches';

/** The full parametric board design - stored as JSONB */
export interface BoardDesignData {
  formatVersion: number;
  units: Units;

  /** Overall dimensions in the chosen unit */
  dimensions: {
    length: number;
    width: number;
    thickness: number;
  };

  /** Half-outline curve (top view, one side - mirrored for symmetry) */
  outline: NURBSCurveData;

  /** Bottom rocker curve (side profile) */
  rocker: NURBSCurveData;

  /** Deck rocker curve (side profile of deck) */
  deckRocker: NURBSCurveData;

  /** Thickness distribution along board length */
  thickness: NURBSCurveData;

  /** Cross-section templates at defined stations */
  crossSections: CrossSectionData[];

  /** Rail profile curve */
  railProfile?: NURBSCurveData;

  /** Fin plug positions */
  fins: FinPlugData[];

  /** Whether the outline is symmetric (mirrored) */
  symmetric: boolean;

  /** Computed volume in liters (updated on each edit) */
  computedVolume?: number;
}

/** Board metadata for listing/display */
export interface BoardMeta {
  id: string;
  userId: string;
  name: string;
  description?: string;
  boardType: BoardType;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl?: string;
}

/** Full board record including design data */
export interface Board extends BoardMeta {
  data: BoardDesignData;
  version: number;
}

/** API request/response types */
export interface CreateBoardRequest {
  name: string;
  boardType: BoardType;
  data: BoardDesignData;
  description?: string;
}

export interface UpdateBoardRequest {
  name?: string;
  description?: string;
  boardType?: BoardType;
  data?: BoardDesignData;
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: { id: string; email: string; name: string };
}
