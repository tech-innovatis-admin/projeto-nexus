"use client";

import { createContext, useContext } from "react";

const CartoKeyContext = createContext("");

export function CartoKeyProvider({
  apiKey,
  children,
}: {
  apiKey: string;
  children: React.ReactNode;
}) {
  return (
    <CartoKeyContext.Provider value={apiKey}>{children}</CartoKeyContext.Provider>
  );
}

export function useCartoApiKey() {
  return useContext(CartoKeyContext);
}
