"use client";

import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";

export interface Gregory3DProps {
  className?: string;
}

/**
 * Modelo do Gregory + balão de fala
 */
function GregoryModel() {
  const { scene } = useGLTF("/modelos_3d/gregory_3d.glb");

  return (
    // Grupo para mover/rotacionar boneco e balão juntos
    <group
      position={[-0.8, -1.35, 0]}       // um pouco mais à esquerda e para baixo
      rotation={[0, Math.PI / 9, 0]}    // leve giro olhando para o centro
      scale={1.1}                       // menor que antes para caber melhor
    >
      {/* Boneco 3D estático */}
      <primitive object={scene} />

      {/* Balão preso acima da cabeça */}
      <Html
        position={[0.25, 1.55, 0]} // mais baixo, bem próximo da cabeça
        distanceFactor={40}        // balão bem menor (aumentar -> menor, diminuir -> maior)
        transform
      >
        <div className="max-w-[230px] rounded-2xl border border-slate-700/70 bg-slate-900/95 px-3 py-2 text-[11px] leading-snug text-slate-100 shadow-xl backdrop-blur">
          <p className="font-semibold text-blue-300">
            Olá, meu nome é Gregory
          </p>
          <p className="mt-1">
            e essa é a NEXUS! Nossa plataforma de produtos e dados municipais.
          </p>

          {/* rabinho do balão */}
          <div className="relative mt-1 h-0 w-0">
            <div className="absolute left-6 -top-[2px] h-3 w-3 rotate-45 border-b border-r border-slate-700/70 bg-slate-900/95" />
          </div>
        </div>
      </Html>
    </group>
  );
}

/**
 * Wrapper com Canvas configurado.
 * Use este componente direto na página inicial.
 */
const Gregory3D: React.FC<Gregory3DProps> = ({ className }) => {
  return (
    <div
      className={`relative mx-auto h-[340px] w-full max-w-xl md:h-[400px] ${
        className ?? ""
      }`}
    >
      <Canvas
        camera={{ position: [0, 1.7, 4], fov: 40 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Luzes simples */}
        <ambientLight intensity={0.9} />
        <directionalLight intensity={1.2} position={[3, 4, 2]} />
        <directionalLight intensity={0.4} position={[-3, 2, -2]} />

        <Suspense
          fallback={
            <Html center>
              <div className="rounded-xl bg-slate-900/80 px-4 py-2 text-xs text-slate-200 shadow-lg backdrop-blur">
                Carregando o Gregory…
              </div>
            </Html>
          }
        >
          <GregoryModel />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Gregory3D;

// Pré-carrega o modelo para evitar flash na primeira renderização
useGLTF.preload("/modelos_3d/gregory_3d.glb");
