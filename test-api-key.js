#!/usr/bin/env node

/**
 * Script de teste direto da API Key do Google Maps
 * Use este script para testar se sua chave API funciona corretamente
 *
 * Como usar:
 * 1. Configure sua API key no arquivo .env.local
 * 2. Execute: node test-api-key.js
 */

const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

async function testAPIKey() {
  console.log('🧪 TESTE DIRETO DA API KEY GOOGLE MAPS');
  console.log('=====================================\n');

  console.log('📋 INSTRUÇÕES DE CONFIGURAÇÃO:');
  console.log('1. Copie o arquivo .env.local.example para .env.local');
  console.log('2. Configure sua chave API real no arquivo .env.local');
  console.log('3. Certifique-se de que ativou as APIs necessárias no Google Cloud Console');
  console.log('');

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.log('❌ ERRO: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY não encontrada!');
    console.log('');
    console.log('🔧 SOLUÇÃO:');
    console.log('1. Crie um arquivo chamado .env.local na raiz do projeto');
    console.log('2. Adicione esta linha:');
    console.log('   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=sua_chave_aqui');
    console.log('3. Reinicie o servidor: npm run dev');
    console.log('');
    console.log('📖 Arquivo .env.local.example foi criado como referência.');
    process.exit(1);
  }

  if (apiKey === 'sua_chave_api_aqui') {
    console.log('❌ ERRO: Você precisa configurar uma chave API real!');
    console.log('Substitua "sua_chave_api_aqui" pela sua chave do Google Cloud Console.');
    process.exit(1);
  }

  console.log('🔑 Verificação da API Key:');
  console.log('  - Presente:', !!apiKey);
  console.log('  - Comprimento:', apiKey.length);
  console.log('  - Primeiros 10 chars:', apiKey.substring(0, 10) + '...');
  console.log('  - Últimos 10 chars:', '...' + apiKey.substring(apiKey.length - 10));
  console.log('  - Caracteres válidos:', /^[A-Za-z0-9_-]+$/.test(apiKey));
  console.log('');

  // Teste 1: Geocoding API
  console.log('🗺️ Teste 1: Geocoding API');
  console.log('-------------------------');

  try {
    const endereco = 'João Pessoa, PB, Brasil';
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(endereco)}&key=${apiKey}&region=BR&language=pt-BR`;

    console.log('📍 Endereço:', endereco);
    console.log('🔗 URL (sem chave):', geocodeUrl.replace(apiKey, 'API_KEY_HIDED'));

    const response = await fetch(geocodeUrl);
    const data = await response.json();

    console.log('📊 Status HTTP:', response.status);
    console.log('📊 Status da API:', data.status);

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      console.log('✅ SUCESSO! Coordenadas encontradas:');
      console.log('  - Latitude:', location.lat);
      console.log('  - Longitude:', location.lng);
    } else {
      console.log('❌ FALHA!');
      console.log('  - Erro:', data.error_message || 'Erro desconhecido');
      console.log('  - Detalhes:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log('❌ ERRO na requisição:', error.message);
  }

  console.log('\n');

  // Teste 2: Routes API
  console.log('🛣️ Teste 2: Routes API');
  console.log('----------------------');

  try {
    const routesBody = {
      origin: {
        location: {
          latLng: {
            latitude: -7.11532,
            longitude: -34.861
          }
        }
      },
      destination: {
        location: {
          latLng: {
            latitude: -7.121,
            longitude: -34.845
          }
        }
      },
      travelMode: 'DRIVE',
      routingPreference: 'BEST_GUESS',
      computeAlternativeRoutes: false,
      routeModifiers: {
        avoidTolls: false,
        avoidHighways: false,
        avoidFerries: false
      },
      languageCode: 'pt-BR',
      regionCode: 'BR',
      units: 'METRIC'
    };

    const routesUrl = `https://routes.googleapis.com/directions/v2:computeRoutes?key=${apiKey}`;

    console.log('📍 Origem: João Pessoa, PB');
    console.log('🎯 Destino: Centro de João Pessoa, PB');
    console.log('🚗 Modo: DRIVE');

    const response = await fetch(routesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
      },
      body: JSON.stringify(routesBody)
    });

    const data = await response.json();

    console.log('📊 Status HTTP:', response.status);

    if (response.ok && data.routes && data.routes.length > 0) {
      console.log('✅ SUCESSO! Rota calculada:');
      console.log('  - Distância:', Math.round(data.routes[0].distanceMeters / 1000), 'km');
      console.log('  - Duração:', data.routes[0].duration);
    } else {
      console.log('❌ FALHA!');
      console.log('  - Status:', data.status);
      console.log('  - Erro:', data.error?.message || 'Erro desconhecido');
      console.log('  - Detalhes:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log('❌ ERRO na requisição:', error.message);
  }

  console.log('\n🎯 DIAGNÓSTICO FINAL');
  console.log('===================');

  // Diagnóstico baseado nos resultados
  console.log('\n💡 RECOMENDAÇÕES:');
  console.log('1. Verifique se ativou as seguintes APIs no Google Cloud Console:');
  console.log('   - ✅ Geocoding API');
  console.log('   - ✅ Routes API');
  console.log('   - ✅ Maps JavaScript API');
  console.log('');
  console.log('2. Verifique as restrições da API Key:');
  console.log('   - Application restrictions: None ou seu domínio');
  console.log('   - API restrictions: Adicione as APIs acima');
  console.log('');
  console.log('3. Aguarde alguns minutos após mudanças no Console');
  console.log('');
  console.log('4. Se ainda não funcionar, crie uma nova chave API');
}

// Executar teste
testAPIKey().catch(console.error);
