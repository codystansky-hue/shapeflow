declare module 'verb-nurbs-web' {
  namespace geom {
    class NurbsCurveData {
      constructor(degree: number, knots: number[], controlPoints: number[][]);
    }
    class NurbsCurve {
      constructor(data: NurbsCurveData);
      static byKnotsControlPointsWeights(
        degree: number,
        knots: number[],
        controlPoints: number[][],
        weights?: number[]
      ): NurbsCurve;
      point(t: number): number[];
      tangent(t: number): number[];
      derivatives(t: number, n?: number): number[][];
      split(t: number): NurbsCurve[];
      clone(): NurbsCurve;
    }
    class NurbsSurfaceData {
      constructor(
        degreeU: number,
        degreeV: number,
        knotsU: number[],
        knotsV: number[],
        controlPoints: number[][][]
      );
    }
    class NurbsSurface {
      constructor(data: NurbsSurfaceData);
      static byLoftingCurves(curves: NurbsCurve[], degreeV?: number): NurbsSurface;
      static byKnotsControlPointsWeights(
        degreeU: number,
        degreeV: number,
        knotsU: number[],
        knotsV: number[],
        controlPoints: number[][][],
        weights?: number[][]
      ): NurbsSurface;
      point(u: number, v: number): number[];
      normal(u: number, v: number): number[];
      tessellate(options?: { minDivsU?: number; minDivsV?: number }): {
        points: number[][];
        faces: number[][];
        normals: number[][];
        uvs: number[][];
      };
    }
  }
  namespace eval {
    class Tess {
      static rationalSurfaceAdaptive(surface: geom.NurbsSurfaceData, options?: object): {
        points: number[][];
        faces: number[][];
        normals: number[][];
      };
    }
  }
  const verb: { geom: typeof geom; eval: typeof eval };
  export = verb;
}
