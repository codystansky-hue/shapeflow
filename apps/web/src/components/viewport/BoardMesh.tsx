import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useBoardStore } from '@/store/boardStore';
import { BoardModel } from '@/core/parametric/BoardModel';
import { loftBoard } from '@/core/parametric/Lofter';

const BoardMesh: React.FC = () => {
  const design = useBoardStore((s) => s.design);

  const geometry = useMemo(() => {
    if (!design) return null;

    try {
      const model = BoardModel.fromDesignData(design);
      return loftBoard(model, { stations: 100, ringPoints: 48 });
    } catch (e) {
      console.warn('Lofter failed, using placeholder:', e);
      const { length, width, thickness } = design.dimensions;
      return new THREE.BoxGeometry(length, thickness, width);
    }
  }, [design]);

  if (!geometry || !design) {
    return (
      <mesh>
        <boxGeometry args={[600, 20, 200]} />
        <meshStandardMaterial color="#1e5a6e" opacity={0.4} transparent />
      </mesh>
    );
  }

  return (
    <group>
      {/* Main board mesh */}
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#3db8d4"
          metalness={0.15}
          roughness={0.55}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Wireframe overlay */}
      <mesh geometry={geometry}>
        <meshBasicMaterial
          color="#0ea5e9"
          wireframe
          transparent
          opacity={0.08}
        />
      </mesh>
    </group>
  );
};

export default BoardMesh;
