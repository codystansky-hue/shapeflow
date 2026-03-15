import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import BoardMesh from './BoardMesh';
import { useUIStore } from '@/store/uiStore';

const cameraPresets: Record<string, { position: [number, number, number]; fov: number }> = {
  perspective: { position: [800, 600, 1200], fov: 45 },
  top: { position: [0, 2000, 0], fov: 30 },
  side: { position: [0, 0, 2000], fov: 30 },
  front: { position: [2000, 0, 0], fov: 30 },
};

const Viewport3D: React.FC = () => {
  const activeView = useUIStore((s) => s.activeView);
  const showGrid = useUIStore((s) => s.showGrid);
  const preset = cameraPresets[activeView] ?? cameraPresets.perspective;

  return (
    <div className="w-full h-full relative bg-[var(--bg-primary)]">
      <Canvas
        camera={{ position: preset.position, fov: preset.fov, near: 1, far: 10000 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#1a1a2e' }}
      >
        <color attach="background" args={['#1a1a2e']} />

        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[500, 1000, 500]} intensity={0.8} castShadow />
        <directionalLight position={[-300, 400, -200]} intensity={0.3} />

        {/* Grid */}
        {showGrid && (
          <Grid
            args={[4000, 4000]}
            cellSize={50}
            cellThickness={0.5}
            cellColor="#2a3a5c"
            sectionSize={200}
            sectionThickness={1}
            sectionColor="#3a4a6c"
            fadeDistance={4000}
            fadeStrength={1}
            infiniteGrid
          />
        )}

        {/* Board */}
        <BoardMesh />

        {/* Controls */}
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.1}
          minDistance={200}
          maxDistance={5000}
        />
      </Canvas>
    </div>
  );
};

export default Viewport3D;
