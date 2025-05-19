"use client";
import React from "react";

interface LayerControlProps {
  layers: { key: string; label: string; checked: boolean }[];
  onToggle: (key: string, checked: boolean) => void;
}

export default function LayerControl({ layers, onToggle }: LayerControlProps) {
  return (
    <div className="absolute top-4 left-4 z-30 bg-white/90 dark:bg-gray-900/90 rounded-lg shadow-lg p-4 flex flex-col gap-2 border border-gray-200 dark:border-gray-700 animate-fade-in">
      <span className="font-bold text-blue-900 dark:text-blue-200 mb-1 text-sm">Camadas do Mapa</span>
      {layers.map(layer => (
        <label key={layer.key} className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={layer.checked}
            onChange={e => onToggle(layer.key, e.target.checked)}
            className="accent-blue-700"
          />
          <span>{layer.label}</span>
        </label>
      ))}
    </div>
  );
} 