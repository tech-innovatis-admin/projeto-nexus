"use client";
import React from "react";

interface LayerControlProps {
  layers: { key: string; label: string; checked: boolean }[];
  onToggle: (key: string, checked: boolean) => void;
}

export default function LayerControl({ layers, onToggle }: LayerControlProps) {
  return (
    <div className="absolute top-2 left-2 z-30 bg-white/90 dark:bg-gray-900/90 rounded-lg shadow-lg p-2 flex flex-col gap-1 border border-gray-200 dark:border-gray-700 animate-fade-in text-xs">
      <span className="font-bold text-blue-900 dark:text-blue-200 mb-0.5 text-xs">Camadas do Mapa</span>
      {layers.map(layer => (
        <label key={layer.key} className="flex items-center gap-1 cursor-pointer text-xs">
          <input
            type="checkbox"
            checked={layer.checked}
            onChange={e => onToggle(layer.key, e.target.checked)}
            className="accent-blue-700 w-3 h-3"
          />
          <span>{layer.label}</span>
        </label>
      ))}
    </div>
  );
} 