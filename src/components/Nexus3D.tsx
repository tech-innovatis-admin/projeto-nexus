'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './Nexus3D.module.css';

export default function Nexus3D({ hideText3D = false }: { hideText3D?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; color: string; dx?: number; dy?: number }>>([]);
  const animationFrameId = useRef<number | null>(null); // Para requestAnimationFrame

  // Gerar partículas
  useEffect(() => {
    const newParticles = [];
    const count = 60;
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        color: `rgba(${Math.floor(Math.random() * 60) + 160}, ${Math.floor(Math.random() * 60) + 180}, ${Math.floor(Math.random() * 60) + 200}, ${Math.random() * 0.5 + 0.3})`,
        dx: (Math.random() - 0.5) * 0.08, // velocidade X lenta
        dy: (Math.random() - 0.5) * 0.08  // velocidade Y lenta
      });
    }
    setParticles(newParticles);
  }, []);

  // Movimento contínuo das partículas
  useEffect(() => {
    let animationId: number;
    function animateParticles() {
      setParticles((prevParticles) =>
        prevParticles.map((p) => {
          let newX = p.x + (p.dx ?? 0);
          let newY = p.y + (p.dy ?? 0);
          // Rebote nas bordas
          let dx = p.dx ?? 0;
          let dy = p.dy ?? 0;
          if (newX < 0 || newX > 100) dx = -dx;
          if (newY < 0 || newY > 100) dy = -dy;
          // Pequena variação aleatória na direção
          dx += (Math.random() - 0.5) * 0.002;
          dy += (Math.random() - 0.5) * 0.002;
          // Limitar velocidade máxima
          dx = Math.max(Math.min(dx, 0.12), -0.12);
          dy = Math.max(Math.min(dy, 0.12), -0.12);
          return {
            ...p,
            x: Math.max(0, Math.min(100, newX)),
            y: Math.max(0, Math.min(100, newY)),
            dx,
            dy
          };
        })
      );
      animationId = requestAnimationFrame(animateParticles);
    }
    animateParticles();
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Efeito de rastreamento do mouse com requestAnimationFrame
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      animationFrameId.current = requestAnimationFrame(() => {
        if (containerRef.current) {
          const { left, top, width, height } = containerRef.current.getBoundingClientRect();
          const x = (e.clientX - left) / width - 0.5;
          const y = (e.clientY - top) / height - 0.5;
          setMousePosition({ x, y });
        }
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  // Efeito de rotação baseado na posição do mouse (apenas para o texto)
  useEffect(() => {
    if (textRef.current) {
      const intensity = 15;
      const rotateX = mousePosition.y * intensity * -1;
      const rotateY = mousePosition.x * intensity;
      textRef.current.style.transform = `
        perspective(800px)
        rotateX(${rotateX}deg)
        rotateY(${rotateY}deg)
      `;
    }
  }, [mousePosition]);

  return (
    <div ref={containerRef} className={styles.nexus3DContainer}>
      <div className={styles.starsContainer}>
        {particles.map((particle) => (
          <div
            key={particle.id}
            className={styles.particle}
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              backgroundColor: particle.color,
            }}
          />
        ))}
      </div>
      <div className={styles.glowEffect}></div>
      {/* Texto acessível para leitores de tela */}
      <span className={styles.srOnly}>NEXUS</span>
      {!hideText3D && (
        <div ref={textRef} className={styles.nexusText3D} aria-hidden="true">
          <div className={styles.textLayer}>NEXUS</div>
          <div className={styles.textShadow}>NEXUS</div>
        </div>
      )}
    </div>
  );
} 