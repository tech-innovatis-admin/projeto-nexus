# Camada de Municípios Sem Tag

Esta camada exibe municípios que não são Polo nem Periferia ("sem tag") como pano de fundo no mapa, abaixo das demais camadas.

## Como fornecer os dados

- O frontend consome via endpoint: `/api/proxy-geojson/municipios_sem_tag.json`, que acessa a origem (S3) e retorna JSON.
- Garanta que o backend/roteador esteja configurado para este caminho (já previsto no projeto).

### Formatos aceitos

- FeatureCollection GeoJSON:
  {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": { "UF": "SP", "codigo": "3550308", "municipio": "São Paulo", "valor_total_sem_tag": 12345 },
        "geometry": { "type": "MultiPolygon", "coordinates": [[[ [lng, lat], ... ]]] }
      }
    ]
  }

- Array de objetos com `geom_sem_tag`:
  [
    {
      "UF": "SP",
      "codigo": "3550308",
      "municipio": "São Paulo",
      "valor_total_sem_tag": 12345,
      "geom_sem_tag": { "type": "MultiPolygon", "coordinates": [[[ [lng, lat], ... ]]] }
    }
  ]

A normalização para GeoJSON é feita automaticamente no componente `MapLibrePolygons`.

## Filtros e exibição

- A camada é exibida por padrão, com opção de toggle no canto inferior esquerdo ("Sem Tag").
- Quando um filtro de UF é aplicado (na página `/estrategia`), a camada é filtrada para exibir apenas a UF selecionada. No modo de Polo específico, a camada permanece geral (contexto nacional) por padrão.
- A camada está no nível mais baixo do mapa, abaixo de Periferias e Polos.

## Popups

- Ao clicar em um município sem tag, o popup exibe: Município, UF, Código e `valor_total_sem_tag` (se existir).

## Observações

- Se o arquivo não estiver presente, a camada permanece vazia e um aviso é registrado no console.
