"use client";
import { useEffect, useRef, useState } from "react";
import L, { Map as LeafletMap, GeoJSON, Layer, LayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import { useMapData } from "../contexts/MapDataContext";
import * as turf from '@turf/turf';

// Interface para os dados do S3
interface GeoJSONFile {
  name: string;
  data: any;
}

// Tipos para as props do componente
interface MapaMunicipalProps {
  municipioSelecionado: any;
}

// Função utilitária para remover acentos
function removerAcentos(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Cores das camadas
const cores = {
  dados: "#56B4E9",
  pdsemplano: "#E69F00",
  produtos: "#009E73",
  pdvencendo: "#D55E00",
};

// Cores por estado
const coresEstados = {
  "Acre": "#1f78b4",
  "Alagoas": "#33a02c",
  "Amapá": "#6a3d9a",
  "Amazonas": "#b15928",
  "Bahia": "#a6cee3",
  "Ceará": "#4daf4a",
  "Distrito Federal": "#fdbf6f",
  "Espírito Santo": "#cab2d6",
  "Goiás": "#ffff99",
  "Maranhão": "#fb9a99",
  "Mato Grosso": "#e31a1c",
  "Mato Grosso do Sul": "#fdbf6f",
  "Minas Gerais": "#ff7f00",
  "Pará": "#b2df8a",
  "Paraíba": "#e41a1c",
  "Paraná": "#377eb8",
  "Pernambuco": "#377eb8",
  "Piauí": "#6a3d9a",
  "Rio de Janeiro": "#a6cee3",
  "Rio Grande do Norte": "#ff7f00",
  "Rio Grande do Sul": "#b15928",
  "Rondônia": "#cab2d6",
  "Roraima": "#ffff99",
  "Santa Catarina": "#33a02c",
  "São Paulo": "#1f78b4",
  "Sergipe": "#fb9a99",
  "Tocantins": "#b2df8a",
  "Outro": "#999999"
};

// Função para retornar a cor do estado
function getCorEstado(nomeEstado: string) {
  return coresEstados[nomeEstado as keyof typeof coresEstados] || coresEstados["Outro"];
}

// Funções para formatar os popups específicos por camada
function popupDadosGerais(p: any) {
  return `
    <b>Estado:</b> ${p.name_state || ""}<br>
    <b>Município:</b> ${p.nome_municipio || ""}<br>
    <b>Prefeito 2024:</b> ${p.nome2024 || ""}<br>
    <b>Partido:</b> ${p.sigla_partido2024 || ""}<br>
    <b>Mandato:</b> ${p.mandato || ""}<br>
    <b>População:</b> ${p.POPULACAO_FORMAT || ""}<br>
    <b>Domicílios:</b> ${p.DOMICILIO_FORMAT || ""}<br>
    <b>Plano Diretor:</b> ${p.PD_ALTERADA || ""}<br>
    <b>Ano do Plano Diretor:</b> ${p.PD_ANO || ""}<br>
    <b>Plano Diretor Vencido:</b> ${p.pd_venci || ""}<br>
    <b>REURB:</b> ${p.reurb_exist || ""}<br>
    <b>Ano do REURB:</b> ${p.REURB_ANO || ""}<br>
    <b>Valor do Plano Diretor:</b> ${p.VALOR_PD || ""}<br>
    <b>Valor do PMSB:</b> ${p.VALOR_PMSB || ""}<br>
    <b>Valor do REURB:</b> ${p.VALOR_REURB || ""}<br>
    <b>Valor do Plano Desertificação:</b> ${p.desert || ""}<br>
    <b>Valor do Plano Decenal Ambiental:</b> ${p.dec_ambiente || ""}<br>
    <b>Valor do Start Iniciais:</b> ${p.VALOR_START_INICIAIS || ""}<br>
    <b>Valor do Start Finais:</b> ${p.VALOR_START_FINAIS || ""}<br>
    <b>Valor do Start Iniciais e Finais:</b> ${p.VALOR_START_INICIAIS_FINAIS || ""}
  `;
}

function popupPDVencimento(p: any) {
  return `
    <b>Estado:</b> ${p.name_state || ""}<br>
    <b>Município:</b> ${p.municipio || ""}<br>
    <b>Prefeito:</b> ${p.nome2024 || ""}<br>
    <b>Partido:</b> ${p.sigla_partido2024 || ""}<br>
    <b>Mandato:</b> ${p.mandato || ""}<br>
    <b>Valor do Plano Diretor:</b> ${p.VALOR_PD || ""}
  `;
}

function popupProdutos(p: any) {
  return `
    <b>Estado:</b> ${p.name_state || ""}<br>
    <b>Município:</b> ${p.municipio || ""}<br>
    <b>Valor do PMSB:</b> ${p.VALOR_PMSB || ""}<br>
    <b>Valor do Plano Diretor:</b> ${p.VALOR_PD || ""}<br>
    <b>Valor do CTM:</b> ${p.VALOR_CTM || ""}<br>
    <b>Valor do REURB:</b> ${p.VALOR_REURB || ""}<br>
    <b>Valor do Plano Decenal Ambiental:</b> ${p.dec_ambiente || ""}<br>
    <b>Valor do Plano Desertificação:</b> ${p.desert || ""}<br>
    <b>Valor do Start Iniciais:</b> ${p.VALOR_START_INICIAIS || ""}<br>
    <b>Valor do Start Finais:</b> ${p.VALOR_START_FINAIS || ""}<br>
    <b>Valor do Start Iniciais e Finais:</b> ${p.VALOR_START_INICIAIS_FINAIS || ""}
  `;
}

function popupPDSemPlano(p: any) {
  return `
    <b>Estado:</b> ${p.name_state || ""}<br>
    <b>Município:</b> ${p.municipio || ""}<br>
    <b>Prefeito:</b> ${p.nome2024 || ""}<br>
    <b>Partido:</b> ${p.sigla_partido2024 || ""}<br>
    <b>Mandato:</b> ${p.mandato || ""}<br>
    <b>População:</b> ${p.POPULACAO_FORMAT || ""}<br>
    <b>Existe Plano Diretor:</b> ${p.PD_ALTERADA || ""}<br>
    <b>Valor do Plano Diretor:</b> ${p.VALOR_PD || ""}
  `;
}

export default function MapaMunicipal({ municipioSelecionado }: MapaMunicipalProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const layersRef = useRef<{ [key: string]: GeoJSON | LayerGroup | null }>({});
  const popupRef = useRef<L.Popup | null>(null);
  const dadosGeraisRef = useRef<any>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const alfineteMarkerRef = useRef<L.Marker | null>(null);
  const [layerState, setLayerState] = useState({
    dados: false,
    pdsemplano: false,
    produtos: false,
    pdvencendo: false,
    parceiros: false,
  });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousMunicipioRef = useRef<any>(null);

  const { mapData, loading, error } = useMapData();

  // Carrega o mapa e as camadas apenas uma vez
  useEffect(() => {
    // Aguarda o DOM estar pronto e os dados estarem carregados
    setTimeout(async () => {
      if (mapRef.current || loading || !mapData) return;
      
      const mapContainer = document.getElementById("mapa-leaflet");
      if (!mapContainer) {
        console.error("Elemento #mapa-leaflet não encontrado no DOM");
        return;
      }

      console.log("Iniciando mapa Leaflet");
      mapRef.current = L.map("mapa-leaflet", {
        center: [-14, -55],
        zoom: 4,
        minZoom: 3,
        maxZoom: 18,
        zoomControl: true,
        attributionControl: false,
      });
      
      // Camada base
      const carto = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; CartoDB",
      }).addTo(mapRef.current);
      
      // Adiciona controle de desenho
      try {
        drawnItemsRef.current = new L.FeatureGroup();
        drawnItemsRef.current.addTo(mapRef.current);
        
        // Corrigindo o erro com a tipagem do L.Control.Draw
        const drawControl = new (L.Control as any).Draw({
          draw: {
            polygon: false,
            polyline: true,
            rectangle: false,
            circle: true,
            marker: false,
            circlemarker: false
          },
          edit: {
            featureGroup: drawnItemsRef.current,
            remove: true,
            edit: false
          }
        });
        
        mapRef.current.addControl(drawControl);
        
        mapRef.current.on(L.Draw.Event.CREATED, function (event) {
          drawnItemsRef.current?.addLayer(event.layer);
        });
      } catch (error) {
        console.error("Erro ao inicializar controle de desenho:", error);
      }

      console.log("Configurando camadas do mapa");
      try {
        // Dados Gerais
        dadosGeraisRef.current = mapData.dados;
        layersRef.current.dados = L.geoJSON(mapData.dados, {
          style: function(feature) {
            return {
              color: "#222",
              weight: 0.7,
              fillOpacity: 0.7,
              fillColor: getCorEstado(feature?.properties?.name_state || "Outro")
            };
          },
          onEachFeature: (feature, layer) => {
            layer.bindPopup(popupDadosGerais(feature.properties));
          },
        });
        
        // PD sem plano
        layersRef.current.pdsemplano = L.geoJSON(mapData.pdsemplano, {
          style: function(feature) {
            return {
              color: "#222",
              weight: 0.7,
              fillOpacity: 0.7,
              fillColor: getCorEstado(feature?.properties?.name_state || "Outro")
            };
          },
          onEachFeature: (feature, layer) => {
            layer.bindPopup(popupPDSemPlano(feature.properties));
          },
        });
        
        // Produtos
        layersRef.current.produtos = L.geoJSON(mapData.produtos, {
          style: function(feature) {
            return {
              color: "#222",
              weight: 0.7,
              fillOpacity: 0.7,
              fillColor: getCorEstado(feature?.properties?.name_state || "Outro")
            };
          },
          onEachFeature: (feature, layer) => {
            layer.bindPopup(popupProdutos(feature.properties));
          },
        });
        
        // PD vencendo
        layersRef.current.pdvencendo = L.geoJSON(mapData.pdvencendo, {
          style: function(feature) {
            return {
              color: "#222",
              weight: 0.7,
              fillOpacity: 0.7,
              fillColor: getCorEstado(feature?.properties?.name_state || "Outro")
            };
          },
          onEachFeature: (feature, layer) => {
            layer.bindPopup(popupPDVencimento(feature.properties));
          },
        });
        
        // Parceiros (marcadores customizados)
        const parceirosGroup = L.layerGroup();
        const parceiros = mapData.parceiros;
        parceiros.forEach((p: any) => {
          const corMarcador = p.categoria === "funda" ? "#7DD3FC" : "#1E40AF";
          const buildingIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="${corMarcador}">
            <path d="M17 11V3H7v4H3v14h8v-4h2v4h8V11h-4zM7 19H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V9h2v2zm4 4H9v-2h2v2zm0-4H9V9h2v2zm0-4H9V5h2v2zm4 8h-2v-2h2v2zm0-4h-2V9h2v2zm0-4h-2V5h2v2zm4 12h-2v-2h2v2zm0-4h-2v-2h2v2z"/>
          </svg>`;
          
          const icon = L.divIcon({
            className: "custom-building-icon",
            html: buildingIcon,
            iconSize: [29, 29],
            iconAnchor: [16, 32],
          });
          
          const marker = L.marker([p.lat, p.lng], { icon })
            .bindPopup(`<b>Parceiro:</b> ${p.parce}<br><b>Tipo:</b> ${p.categoria === "funda" ? "Fundação" : "IFES"}`);
          parceirosGroup.addLayer(marker);
        });
        layersRef.current.parceiros = parceirosGroup;
        
        console.log("Adicionando camadas ao mapa");
        // Adiciona camadas iniciais
        Object.entries(layerState).forEach(([key, checked]) => {
          if (checked && layersRef.current[key]) {
            layersRef.current[key]!.addTo(mapRef.current!);
          }
        });

        // Adiciona controle de camadas do Leaflet para as camadas temáticas
        const overlayMaps = {
          "Dados Gerais": layersRef.current.dados,
          "PD - Sem Plano e +20K": layersRef.current.pdsemplano,
          "Produtos Municipais": layersRef.current.produtos,
          "PD em Vencimento": layersRef.current.pdvencendo,
          "Parceiros": layersRef.current.parceiros,
        };
        L.control.layers(
          {
            "CartoDB - Claro": carto
          },
          overlayMaps,
          { collapsed: false, position: "bottomleft" }
        ).addTo(mapRef.current!);

      } catch (error) {
        console.error("Erro ao configurar camadas do mapa:", error);
      }
    }, 100);
  }, [mapData, loading, layerState]);

  // Atualiza visibilidade das camadas ao mudar o estado
  useEffect(() => {
    if (!mapRef.current) return;
    Object.entries(layerState).forEach(([key, checked]) => {
      if (layersRef.current[key]) {
        if (checked) {
          layersRef.current[key]!.addTo(mapRef.current!);
        } else {
          mapRef.current!.removeLayer(layersRef.current[key]!);
        }
      }
    });
  }, [layerState]);

  // Adicionar efeito para destacar municípioSelecionado e adicionar o alfinete
  useEffect(() => {
    if (!municipioSelecionado || !dadosGeraisRef.current || !mapRef.current) return;
    
    // Inicia a transição
    setIsTransitioning(true);
    
    // Armazena o município anterior para referência
    const previousMunicipio = previousMunicipioRef.current;
    previousMunicipioRef.current = municipioSelecionado;
    
    // Função para aplicar o destaque com fade
    const applyHighlight = () => {
      // Remove destaque anterior
      if (layersRef.current.destaque) {
        mapRef.current?.removeLayer(layersRef.current.destaque);
        layersRef.current.destaque = null;
      }
      
      // Remove alfinete anterior se existir
      if (alfineteMarkerRef.current) {
        mapRef.current?.removeLayer(alfineteMarkerRef.current);
        alfineteMarkerRef.current = null;
      }
      
      // Fecha popup anterior se existir
      if (popupRef.current) {
        mapRef.current?.closePopup(popupRef.current);
        popupRef.current = null;
      }
      
      // Destaca o município com opacidade inicial baixa para o efeito de fade
      const destaqueLayer = L.geoJSON(municipioSelecionado, {
        style: {
          color: "#1E40AF", // azul escuro (blue-800) para as bordas
          weight: 3,
          fillOpacity: 0,  // Começa com opacidade zero para o efeito de fade
          fillColor: "#60A5FA" // azul mais claro (blue-400) para o preenchimento
        },
      });
      
      layersRef.current.destaque = destaqueLayer;
      destaqueLayer.addTo(mapRef.current!);
      
      // Calcula o centro do polígono usando Turf.js para maior precisão
      const bounds = destaqueLayer.getBounds();
      
      // Tenta usar Turf.js para calcular o centroide real do polígono
      let center;
      try {
        // Usa o centroide do Turf para um posicionamento mais preciso
        const centroid = turf.centroid(municipioSelecionado);
        // Converte as coordenadas do Turf (longitude, latitude) para o formato do Leaflet (latitude, longitude)
        center = L.latLng(centroid.geometry.coordinates[1], centroid.geometry.coordinates[0]);
        
        // Verifica se o centroide está dentro do polígono
        // Se não estiver, usamos o centro da bounding box como fallback
        const point = turf.point([center.lng, center.lat]);
        const polygon = municipioSelecionado.geometry.type === 'MultiPolygon' 
          ? turf.multiPolygon(municipioSelecionado.geometry.coordinates)
          : turf.polygon(municipioSelecionado.geometry.coordinates);
        
        const isInside = turf.booleanPointInPolygon(point, polygon);
        if (!isInside) {
          console.log("Centroide fora do polígono, usando centro da bounding box");
          center = bounds.getCenter();
        }
      } catch (error) {
        console.error("Erro ao calcular centroide com Turf.js:", error);
        // Fallback para o método padrão do Leaflet se o Turf falhar
        center = bounds.getCenter();
      }
      
      // Cria um ícone personalizado para o alfinete
      const alfineteIcon = L.icon({
        iconUrl: '/alfinete_logo_branca.svg',
        iconSize: [81, 81],     // tamanho do ícone aumentado em +10% (de 74 para 81)
        iconAnchor: [40, 81],   // ponto do ícone que corresponderá à localização do marcador (ajustado proporcionalmente)
        popupAnchor: [0, -81],  // ponto a partir do qual o popup deve abrir em relação ao iconAnchor (ajustado)
        className: 'pin-animation' // Adiciona a classe para a animação
      });
      
      // Adiciona o alfinete no centro do polígono com opacidade inicial baixa
      alfineteMarkerRef.current = L.marker(center, { 
        icon: alfineteIcon,
        opacity: 0 // Começa com opacidade zero
      }).bindPopup(`<b>${municipioSelecionado.properties?.nome_municipio || municipioSelecionado.properties?.municipio}</b><br>
                    <b>Estado:</b> ${municipioSelecionado.properties?.name_state || ""}`)
        .addTo(mapRef.current!);
      
      // Ajusta o zoom para mostrar o município com animação
      mapRef.current!.flyToBounds(bounds, { 
        maxZoom: 10,
        duration: 0.75 // Duração da animação em segundos
      });
      
      // Aplica o efeito de fade gradualmente
      let opacity = 0;
      const fadeInterval = setInterval(() => {
        opacity += 0.05;
        if (opacity >= 0.15) {
          clearInterval(fadeInterval);
          opacity = 0.15;
          setIsTransitioning(false); // Finaliza a transição
        }
        
        // Atualiza a opacidade do destaque
        if (layersRef.current.destaque) {
          (layersRef.current.destaque as L.GeoJSON).setStyle({
            fillOpacity: opacity
          });
        }
        
        // Atualiza a opacidade do alfinete
        if (alfineteMarkerRef.current) {
          alfineteMarkerRef.current.setOpacity(Math.min(opacity * 6.67, 1)); // Multiplicador para chegar a 1 mais rápido
        }
      }, 50);
    };
    
    // Se for a primeira seleção, aplica imediatamente
    if (!previousMunicipio) {
      applyHighlight();
    } else {
      // Se já havia um município selecionado, faz um fade-out antes
      if (layersRef.current.destaque) {
        let opacity = 0.15;
        const fadeOutInterval = setInterval(() => {
          opacity -= 0.05;
          if (opacity <= 0) {
            clearInterval(fadeOutInterval);
            applyHighlight(); // Aplica o novo destaque após o fade-out
          }
          
          // Atualiza a opacidade do destaque durante o fade-out
          if (layersRef.current.destaque) {
            (layersRef.current.destaque as L.GeoJSON).setStyle({
              fillOpacity: opacity
            });
          }
          
          // Atualiza a opacidade do alfinete durante o fade-out
          if (alfineteMarkerRef.current) {
            alfineteMarkerRef.current.setOpacity(Math.max(opacity * 6.67, 0));
          }
        }, 40);
      } else {
        applyHighlight();
      }
    }
    
  }, [municipioSelecionado]);

  // Handler para alternar camadas
  function handleToggleLayer(key: string, checked: boolean) {
    setLayerState(prev => ({ ...prev, [key]: checked }));
  }

  // Renderiza o mapa e o controle de camadas
  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div className="animate-pulse w-16 h-16 rounded-full bg-sky-500/20"></div>
      </div>
    );
  }

  if (error) {
    return <div>Erro ao carregar dados do mapa: {error}</div>;
  }

  return (
    <div className="relative w-full h-full">
      <div id="mapa-leaflet" className="w-full h-full rounded-lg" style={{ minHeight: "300px" }}></div>
    </div>
  );
}