"use client";
import { useEffect, useRef, useState } from "react";
import L, { Map as LeafletMap, GeoJSON, Layer, LayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import LayerControl from "./LayerControl";
import { fetchAllGeoJSONFiles } from "../utils/s3Service";

// Interface para os dados do S3
interface GeoJSONFile {
  name: string;
  data: any;
}

// Tipos para as props do componente
interface MapaMunicipalProps {
  municipio: string;
  estado: string;
  onMunicipioEncontrado: (feature: any | null) => void;
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

// Função para carregar dados via API
async function loadGeoJSONData() {
  try {
    const response = await fetch('/api/proxy-geojson/files');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Erro ao carregar arquivos GeoJSON:', error);
    throw error;
  }
}

export default function MapaMunicipal({ municipio, estado, onMunicipioEncontrado }: MapaMunicipalProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const layersRef = useRef<{ [key: string]: GeoJSON | LayerGroup | null }>({});
  const dadosGeraisRef = useRef<any>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const [layerState, setLayerState] = useState({
    dados: true,
    pdsemplano: false,
    produtos: false,
    pdvencendo: false,
    parceiros: false,
  });

  // Carrega o mapa e as camadas apenas uma vez
  useEffect(() => {
    // Aguarda o DOM estar pronto
    setTimeout(async () => {
      if (mapRef.current) return;
      
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
      
      // Camadas base
      const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      });
      
      const carto = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; CartoDB",
      }).addTo(mapRef.current);
      
      const sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: "&copy; Esri",
      });
      
      // Adiciona controle de desenho
      try {
        const drawControl = require("leaflet-draw");
        drawnItemsRef.current = new L.FeatureGroup();
        drawnItemsRef.current.addTo(mapRef.current);
        
        const drawControlOptions = new L.Control.Draw({
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
        mapRef.current.addControl(drawControlOptions);
        
        mapRef.current.on(L.Draw.Event.CREATED, function (event) {
          drawnItemsRef.current?.addLayer(event.layer);
        });
      } catch (error) {
        console.error("Erro ao inicializar controle de desenho:", error);
      }

      console.log("Carregando dados GeoJSON via API");
      try {
        const files = await loadGeoJSONData();
        console.log("Dados carregados:", files);

        if (!files || files.length === 0) {
          console.error("Erro: Dados não foram carregados corretamente");
          return;
        }

        // Converter array de arquivos para objeto para facilitar o acesso
        const dados = files.reduce((acc: Record<string, any>, file: GeoJSONFile) => {
          acc[file.name] = file.data;
          return acc;
        }, {} as Record<string, any>);

        // Dados Gerais
        dadosGeraisRef.current = dados['base_municipios.geojson'];
        layersRef.current.dados = L.geoJSON(dados['base_municipios.geojson'], {
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
        layersRef.current.pdsemplano = L.geoJSON(dados['base_pd_sem_plano.geojson'], {
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
        layersRef.current.produtos = L.geoJSON(dados['base_produtos.geojson'], {
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
        layersRef.current.pdvencendo = L.geoJSON(dados['base_pd_vencendo.geojson'], {
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
        const parceiros = dados['parceiros1.json'];
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
        
        // Adiciona legenda
        const legenda = L.control({ position: "topright" });
        legenda.onAdd = function () {
          const div = L.DomUtil.create("div", "info legend");
          div.style.padding = "6px 8px";
          div.style.background = "rgba(255, 255, 255, 0.8)";
          div.style.boxShadow = "0 0 15px rgba(0,0,0,0.2)";
          div.style.borderRadius = "5px";
          
          let labels = [];
          for (let estado in coresEstados) {
            if (estado !== "Outro") {
              labels.push(
                `<i style="background:${coresEstados[estado as keyof typeof coresEstados]}; width:18px; height:18px; display:inline-block; margin-right:5px;"></i> <span style='color:#222;'>${estado}</span>`
              );
            }
          }
          div.innerHTML = "<strong style='color:#000;'>Estados</strong><br>" + labels.join("<br>");
          return div;
        };
        legenda.addTo(mapRef.current!);
        
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
          "Produtos Innovatis": layersRef.current.produtos,
          "PD em Vencimento": layersRef.current.pdvencendo,
          "Parceiros": layersRef.current.parceiros,
        };
        L.control.layers(
          {
            "Padrão (OSM)": osm,
            "CartoDB - Claro": carto,
            "Imagem de Satélite": sat
          },
          overlayMaps,
          { collapsed: false, position: "bottomleft" }
        ).addTo(mapRef.current!);

      } catch (error) {
        console.error("Erro ao carregar dados do S3:", error);
      }
    }, 100);
  }, [layerState]);

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

  // Busca e destaca município apenas quando municipio ou estado são passados
  useEffect(() => {
    // Não faz nada se municipio ou estado estão vazios
    if (!municipio || !estado || !dadosGeraisRef.current || !mapRef.current) return;
    
    console.log("Buscando município:", municipio, estado);
    
    // Remove destaque anterior
    if (layersRef.current.destaque) {
      mapRef.current.removeLayer(layersRef.current.destaque);
      layersRef.current.destaque = null;
    }
    
    // Busca o município
    const feature = dadosGeraisRef.current.features.find((f: any) =>
      f.properties &&
      typeof f.properties.nome_municipio === "string" &&
      typeof f.properties.name_state === "string" &&
      removerAcentos(f.properties.nome_municipio.toLowerCase()) === removerAcentos(municipio.toLowerCase()) &&
      removerAcentos(f.properties.name_state.toLowerCase()) === removerAcentos(estado.toLowerCase())
    );
    
    if (!feature) {
      console.log("Município não encontrado");
      onMunicipioEncontrado(null);
      return;
    }
    
    console.log("Município encontrado, destacando...");
    // Destaca o município
    layersRef.current.destaque = L.geoJSON(feature, {
      style: {
        color: "red",
        weight: 3,
        fillOpacity: 0.2,
      },
    }).addTo(mapRef.current!);
    
    // Zoom menor (8 em vez de 12)
    mapRef.current!.fitBounds(layersRef.current.destaque.getBounds(), { maxZoom: 8 });
    
    layersRef.current.destaque.eachLayer((layer: Layer) => {
      if ((layer as any).getBounds) {
        layer.bindPopup(popupDadosGerais(feature.properties)).openPopup();
      }
    });
    
    onMunicipioEncontrado(feature);
  }, [municipio, estado, onMunicipioEncontrado]);

  // Handler para alternar camadas
  function handleToggleLayer(key: string, checked: boolean) {
    setLayerState(prev => ({ ...prev, [key]: checked }));
  }

  // Renderiza o mapa e o controle de camadas
  return (
    <div className="relative w-full h-full">
      <LayerControl
        layers={[
          { key: "dados", label: "Dados Gerais", checked: layerState.dados },
          { key: "pdsemplano", label: "PD - Sem Plano e +20K", checked: layerState.pdsemplano },
          { key: "produtos", label: "Produtos Innovatis", checked: layerState.produtos },
          { key: "pdvencendo", label: "PD em Vencimento", checked: layerState.pdvencendo },
          { key: "parceiros", label: "Parceiros", checked: layerState.parceiros },
        ]}
        onToggle={handleToggleLayer}
      />
      <div id="mapa-leaflet" className="w-full h-full rounded-lg" style={{ minHeight: "400px" }}></div>
    </div>
  );
}