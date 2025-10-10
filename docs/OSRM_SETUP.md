# Configuração OSRM - Motor de Rotas Terrestres

Este documento descreve a configuração do OSRM (Open Source Routing Machine) para implementação de rotas terrestres no projeto NEXUS.

## 📋 Pré-requisitos

- **Docker** instalado e funcionando
- **Pelo menos 8GB RAM** disponível (recomendado 16GB+)
- **Espaço em disco**: ~20GB para extrato OSM + grafo processado

## 🗺️ Download do Extrato OSM

### Opção Recomendada: Estado de São Paulo (mais rápido)
```bash
# Download do estado de São Paulo (arquivo menor, processamento mais rápido)
wget https://download.geofabrik.de/south-america/brazil/sao-paulo-latest.osm.pbf
```

### Opção Alternativa: Brasil Completo (mais lento)
```bash
# Download do Brasil completo (arquivo maior, processamento demorado)
wget https://download.geofabrik.de/south-america/brazil-latest.osm.pbf
```

**Fonte**: [Geofabrik Brazil Downloads](https://download.geofabrik.de/south-america/brazil.html)

## 🐳 Configuração do Docker OSRM

### 1. Preparar o Contêiner OSRM
```bash
# Baixar imagem OSRM
docker pull osrm/osrm-backend:latest
```

### 2. Processar o Grafo (São Paulo)
```bash
# Extrair grafo
docker run -t -v "$(pwd):/data" osrm/osrm-backend:latest osrm-extract -p /opt/car.lua /data/sao-paulo-latest.osm.pbf

# Particionar grafo
docker run -t -v "$(pwd):/data" osrm/osrm-backend:latest osrm-partition /data/sao-paulo-latest.osrm

# Customizar grafo
docker run -t -v "$(pwd):/data" osrm/osrm-backend:latest osrm-customize /data/sao-paulo-latest.osrm
```

### 3. Iniciar Servidor OSRM
```bash
# Subir servidor na porta 5000
docker run -t -i -p 5000:5000 -v "$(pwd):/data" osrm/osrm-backend:latest osrm-routed --algorithm mld /data/sao-paulo-latest.osrm
```

## 🔍 Validação da Instalação

### Teste Básico no Browser
1. Acesse: `http://localhost:5000`
2. Deve retornar informações sobre o servidor OSRM

### Teste de Rota Simples
```
GET http://localhost:5000/route/v1/driving/-46.633308,-23.550520;-43.172896,-22.906847?overview=false
```
**Resposta esperada**: JSON com `routes[0].duration` e `routes[0].distance`

### Teste de Trip (TSP)
```
GET http://localhost:5000/trip/v1/driving/-46.633308,-23.550520;-43.172896,-22.906847;-47.882165,-15.794229?source=first&destination=last&roundtrip=true&steps=true&overview=full&geometries=geojson
```
**Resposta esperada**: JSON com `trips[0]` contendo waypoints, duration, distance e geometry

## ⚙️ Configuração no Projeto NEXUS

### Arquivo `.env.local`
```env
# OSRM Backend Configuration
OSRM_BACKEND_URL=http://localhost:5000
```

### Endpoint de Smoke Test
- **URL**: `/api/route-osrm-smoke`
- **Método**: GET
- **Função**: Valida conectividade OSRM + testa rota e trip

**Resposta de sucesso**:
```json
{
  "ok": true,
  "osrm_backend_url": "http://localhost:5000",
  "tests": {
    "route": { "status": "success", "duration": 12345, "distance": 987654 },
    "trip": { "status": "success", "waypoints": 3, "total_duration": 24680, "total_distance": 1975308 },
    "haversine": { "distance_km": 357.89, "flight_time_min": 107 }
  }
}
```

## 🔧 Scripts de Automação

Para facilitar o setup, foram criados scripts automatizados:

### Windows (PowerShell)
```powershell
# Execute o script de setup completo
.\scripts\setup-osrm.ps1
```

### Linux/Mac (Bash)
```bash
# Execute o script de setup completo
chmod +x scripts/setup-osrm.sh
./scripts/setup-osrm.sh
```

## 🔧 Comandos de Manutenção

### Reiniciar Contêiner OSRM
```bash
# Parar contêineres OSRM
docker stop $(docker ps -q --filter ancestor=osrm/osrm-backend)

# Reiniciar servidor
docker run -t -i -p 5000:5000 -v "$(pwd):/data" osrm/osrm-backend:latest osrm-routed --algorithm mld /data/sao-paulo-latest.osrm
```

### Limpar Arquivos Temporários
```bash
# Remover arquivos intermediários (.osrm, etc.)
rm sao-paulo-latest.osrm*
```

## 📊 Checklist de Validação

- [ ] Docker instalado e funcionando (`docker --version`)
- [ ] Scripts de setup criados em `scripts/` (setup-osrm.ps1 e setup-osrm.sh)
- [ ] Extrato OSM baixado (sao-paulo-latest.osm.pbf) ou executar script de download
- [ ] Grafo processado (osrm-extract, osrm-partition, osrm-customize)
- [ ] Servidor OSRM rodando na porta 5000
- [ ] `http://localhost:5000` responde
- [ ] Endpoint `/route` funciona com coordenadas de teste
- [ ] Endpoint `/trip` funciona com múltiplas coordenadas
- [ ] `.env.local` contém `OSRM_BACKEND_URL=http://localhost:5000`
- [ ] Dependências instaladas (`@turf/turf` e `axios`)
- [ ] Endpoint `/api/route-osrm-smoke` retorna `{"ok": true}`

## 🚨 Troubleshooting

### Erro: "No route found"
- **Causa**: Coordenadas fora da área coberta pelo extrato OSM
- **Solução**: Use coordenadas dentro do estado/região processado

### Erro: "Connection refused"
- **Causa**: Servidor OSRM não está rodando
- **Solução**: Verifique se o contêiner Docker está ativo

### Erro: "Timeout"
- **Causa**: Rota muito complexa ou servidor sobrecarregado
- **Solução**: Simplifique a rota ou aumente timeout

## 📚 Recursos Adicionais

- **Documentação OSRM**: https://github.com/Project-OSRM/osrm-backend
- **API OSRM**: https://github.com/Project-OSRM/osrm-backend/blob/master/docs/http.md
- **Geofabrik**: https://www.geofabrik.de/
- **OpenStreetMap**: https://www.openstreetmap.org/

---

**Última atualização**: 29 de setembro de 2025
**Extrato usado**: São Paulo (Brazil) - sao-paulo-latest.osm.pbf
**OSRM Version**: Latest (Docker)
**Porta**: 5000
