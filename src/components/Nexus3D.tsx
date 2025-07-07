'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './Nexus3D.module.css';

export default function Nexus3D({ hideText3D = false }: { hideText3D?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [touchPosition, setTouchPosition] = useState<{ x: number; y: number } | null>(null);
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

  // Movimento contínuo das partículas com efeito de repulsão
  useEffect(() => {
    let animationId: number;
    function animateParticles() {
      setParticles((prevParticles) =>
        prevParticles.map((p) => {
          let newX = p.x + (p.dx ?? 0);
          let newY = p.y + (p.dy ?? 0);
          let dx = p.dx ?? 0;
          let dy = p.dy ?? 0;

          // Repulsão do mouse/touch
          let pointer = null;
          if (touchPosition) {
            pointer = touchPosition;
          } else if (containerRef.current && mousePosition) {
            pointer = {
              x: (mousePosition.x + 0.5) * 100,
              y: (mousePosition.y + 0.5) * 100,
            };
          }
          if (pointer) {
            const dist = Math.sqrt((newX - pointer.x) ** 2 + (newY - pointer.y) ** 2);
            const repulseRadius = 9; // raio de repulsão reduzido
            if (dist < repulseRadius) {
              // Força de repulsão proporcional à proximidade
              const angle = Math.atan2(newY - pointer.y, newX - pointer.x);
              const force = (repulseRadius - dist) / repulseRadius * 0.7; // intensidade
              dx += Math.cos(angle) * force;
              dy += Math.sin(angle) * force;
            }
          }

          // Rebote nas bordas
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
  }, [mousePosition, touchPosition]);

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
    const handleTouchMove = (e: TouchEvent) => {
      if (containerRef.current && e.touches.length > 0) {
        const { left, top, width, height } = containerRef.current.getBoundingClientRect();
        const touch = e.touches[0];
        const x = ((touch.clientX - left) / width) * 100;
        const y = ((touch.clientY - top) / height) * 100;
        setTouchPosition({ x, y });
      }
    };
    const handleTouchEnd = () => {
      setTouchPosition(null);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
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