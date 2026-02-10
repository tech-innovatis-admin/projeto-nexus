# Polos - Explicação dos Conceitos

Documentação dos conceitos de categorização de municípios na página de Polos, suas definições, fontes de dados e estilos visuais.

---

## 1. Polo Estratégico

### Definição
Município que possui **relacionamento ativo** com a organização. São municípios cadastrados manualmente no sistema e marcados como ativos para fins de acompanhamento estratégico.

### Base de Dados
- **Fonte:** PostgreSQL
- **Tabela:** `municipios_com_relacionamento`
- **Campo decisivo:** `relacionamento_ativo = true`
- **Identificador:** `code_muni` (código IBGE do município)

O cadastro e ativação/desativação são gerenciados pelo **Modal de Relacionamentos** na interface (`RelacionamentoModal.tsx`), que persiste os dados na tabela `municipios_com_relacionamento`.

### Cores e Opacidades (no mapa)
| Propriedade   | Valor   | Arquivo de referência          |
|---------------|--------|--------------------------------|
| Preenchimento | `#36C244` | `MapaPolos.tsx`, `polosHoverHandlers.ts` |
| Contorno      | `#2A9A35` | `polosHoverHandlers.ts` (CORES_MUNICIPIOS.poloEstrategico) |
| Opacidade     | `0.7` (base) / `0.5` (hover) | `MapaPolos.tsx` (camada `municipios-fill`) |

Na legenda estática, o ícone usa `opacity-40` para diferenciação visual entre Polos Estratégicos e Municípios Satélites.

---

## 2. Municípios Satélites

### Definição
Municípios que são **vizinhos de primeira ordem** (por critério Queen) de algum Polo Estratégico. Representam áreas de influência/adjacência dos polos estratégicos.

**Regra importante:** Um município **não** é considerado Satélite se já for Polo Estratégico ou Polo Logístico. A prioridade de exibição é: Estratégico > Logístico > Satélite.

### Base de Dados
- **Fonte:** PostgreSQL
- **Tabela:** `municipio_vizinhanca_queen`
- **Lógica:** Para cada `code_muni_a` que seja Polo Estratégico (relacionamento_ativo=true), são considerados Satélites os `code_muni_b` onde `ordem = 1`
- **Significado:** `code_muni_b` indica o vizinho de primeira ordem de `code_muni_a`

A lista de Satélites é derivada na API `/api/polos/data` a partir dos Polos Estratégicos ativos e retornada no campo `municipiosSatelites` da resposta.

### Cores e Opacidades (no mapa)
| Propriedade   | Valor   | Arquivo de referência          |
|---------------|--------|--------------------------------|
| Preenchimento | `#F5DF09` | `MapaPolos.tsx`, `polosHoverHandlers.ts` |
| Contorno      | `#C4A800` | `polosHoverHandlers.ts` (CORES_MUNICIPIOS.municipioSatelite) |
| Opacidade     | `0.35` (base) / `0.5` (hover) | `MapaPolos.tsx` (camada `municipios-fill`) |

A opacidade menor (`0.35`) diferencia visualmente os Satélites dos Municípios Oportunidade, mantendo a mesma família de cor amarela.

---

## 3. Polos Logísticos

### Definição
Municípios classificados no GeoJSON com `tipo_polo_satelite = 'polo_logistico'`. Essa classificação vem da base de dados geográfica, não do cadastro de relacionamentos.

**Regra importante:** Se um município for simultaneamente Polo Estratégico e Polo Logístico, ele é exibido como **Polo Estratégico** (prioridade maior). O destaque visual de Polo Logístico só aparece quando o filtro "Polos Logísticos" está ativo no menu.

### Base de Dados
- **Fonte:** AWS S3 / GeoJSON
- **Arquivo:** `base_municipios.geojson`
- **Propriedade:** `properties.tipo_polo_satelite === 'polo_logistico'`

O GeoJSON é carregado via `/api/polos/data`, que busca o arquivo do S3. A propriedade `tipo_polo_satelite` está definida em `MunicipioProperties` em `types.ts`.

### Cores e Opacidades (no mapa)
| Propriedade   | Valor   | Arquivo de referência          |
|---------------|--------|--------------------------------|
| Preenchimento | `#9333EA` | `MapaPolos.tsx`, `polosHoverHandlers.ts` |
| Contorno      | `#7E22CE` (hover) / `#6B21A8` (base) | `polosHoverHandlers.ts` (CORES_MUNICIPIOS.poloLogistico) |
| Opacidade     | `0.7` (base) / `0.5` (hover) | `MapaPolos.tsx` |

A cor roxa diferencia Polos Logísticos das demais categorias. A visibilidade no mapa depende do toggle "Polos Logísticos" no menu de filtros.

---

## 4. Municípios Oportunidade

### Definição
Municípios que **não** se enquadram em nenhuma das categorias anteriores. São todos os demais municípios da base: não possuem relacionamento ativo, não são vizinhos Queen de Polos Estratégicos (ou já são Estratégicos/Logísticos) e não têm `tipo_polo_satelite = 'polo_logistico'`.

Representam municípios potenciais para avaliação futura.

### Base de Dados
- **Fonte:** Mesma base dos demais (GeoJSON `base_municipios.geojson`)
- **Lógica:** Residual; todo município que não é Estratégico, Satélite nem Logístico (por prioridade de exibição)

### Cores e Opacidades (no mapa)
| Propriedade   | Valor   | Arquivo de referência          |
|---------------|--------|--------------------------------|
| Preenchimento | `#F5DF09` | `MapaPolos.tsx`, `polosHoverHandlers.ts` |
| Contorno      | `#C4A800` (base) / `#D4B800` (hover) | `polosHoverHandlers.ts` (CORES_MUNICIPIOS.municOportunidade) |
| Opacidade     | `0.7` (base) / `0.5` (hover) | `MapaPolos.tsx` |

---

## Prioridade de Exibição

A ordem de prioridade para definir a cor e o tipo exibido no mapa é:

1. **Polo Estratégico** (`relacionamento_ativo = true` em `municipios_com_relacionamento`)
2. **Polo Logístico** (`tipo_polo_satelite = 'polo_logistico'` no GeoJSON, com filtro ativo)
3. **Município Satélite** (vizinho Queen de polo estratégico, excluindo Estratégicos e Logísticos)
4. **Município Oportunidade** (demais)

---

## Arquivos de Referência

| Conceito              | Onde é definido/ aplicado                               |
|-----------------------|---------------------------------------------------------|
| Polos Estratégicos    | `page.tsx`, `MapaPolos.tsx`, `polosHoverHandlers.ts`, `RelacionamentoModal.tsx` |
| Municípios Satélites  | `MapaPolos.tsx`, `polosHoverHandlers.ts`, `api/polos/data/route.ts` |
| Polos Logísticos     | `MapaPolos.tsx`, `polosHoverHandlers.ts`, `types.ts`, `EstrategiaPoloFiltersMenu.tsx` |
| Municípios Oportunidade | `MapaPolos.tsx`, `polosHoverHandlers.ts`               |

### Cores centrais (polosHoverHandlers.ts)

```typescript
// CORES_MUNICIPIOS
poloEstrategico:    fill '#36C244', stroke '#2A9A35'
poloLogistico:      fill '#9333EA', stroke '#7E22CE'
municipioSatelite:  fill '#F5DF09', stroke '#C4A800'
municOportunidade:  fill '#F5DF09', stroke '#C4A800'
```

### Opacidades no mapa (MapaPolos.tsx)

- **Hover:** `0.5` (todas as categorias)
- **Satélite (base):** `0.35`
- **Demais (base):** `0.7`
