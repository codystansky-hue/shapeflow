declare module 'verb-nurbs-web' {
  namespace geom {
    class NurbsCurve {
      static byKnotsControlPointsWeights(
        degree: number,
        knots: number[],
        controlPoints: number[][],
        weights?: number[]
      ): NurbsCurve;
      static byPoints(points: number[][], degree?: number): NurbsCurve;
      point(t: number): number[];
      tangent(t: number): number[];
      derivatives(t: number, n?: number): number[][];
      split(t: number): NurbsCurve[];
      clone(): NurbsCurve;
      domain(): { min: number; max: number };
      tessellate(tolerance?: number): number[][];
      degree(): number;
      knots(): number[];
      controlPoints(): number[][];
      weights(): number[];
    }
    class NurbsSurface {
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
      degreeU(): number;
      degreeV(): number;
      knotsU(): number[];
      knotsV(): number[];
      controlPoints(): number[][][];
    }
  }
  const verb: { geom: typeof geom };
  export default verb;
}
