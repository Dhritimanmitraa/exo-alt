import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { CameraState, UserPresence } from '../../lib/realtime/types';

interface Props {
  user: UserPresence;
  camera: CameraState;
}

export default function CameraGhost({ user, camera }: Props) {
  const position = camera.position;
  const target = camera.target;

  // Simple line from camera position to target to visualize view direction
  const points = useMemo(() => {
    return [position, target];
  }, [position, target]);

  return (
    <group>
      <line>
        <bufferGeometry attach="geometry">
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([...points[0], ...points[1]])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial attach="material" color={user.color} linewidth={1} />
      </line>
      <mesh position={position as unknown as [number, number, number]}> 
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshBasicMaterial color={user.color} transparent opacity={0.8} />
      </mesh>
      <Html position={position as unknown as [number, number, number]}> 
        <div style={{ color: 'white', fontSize: 12, background: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: 4 }}>
          {user.name}
        </div>
      </Html>
    </group>
  );
}


