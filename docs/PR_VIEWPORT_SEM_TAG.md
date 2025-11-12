# PR: Ajuste de Viewport + Proxy de Municípios Sem Tag

Resumo do PR
- Corrige warnings de viewport no Next.js movendo a definição para `export const viewport` em `src/app/layout.tsx`.
- Altera o carregamento da base "sem tag" para consumir via endpoint `/api/proxy-geojson/municipios_sem_tag.json` com S3.
- Adiciona logs não intrusivos para confirmar quantidade de features carregadas.
- Documenta como fornecer e testar a camada.

Arquivos alterados
- `src/app/layout.tsx`: remove `viewport` de `metadata` e adiciona `export const viewport` (Next 13.4+).
- `src/components/MapLibrePolygons.tsx`: atualiza o fetch para `/api/proxy-geojson/municipios_sem_tag.json`, ajusta mensagens de log, mantém normalização e filtro por UF.
- `docs/MUNICIPIOS_SEM_TAG.md`: atualiza instruções para uso do endpoint.

Como validar localmente
1. Inicie o ambiente de desenvolvimento:
   - Preferencial: `npm run dev`
   - Observação: Em ambientes OneDrive/Windows, o `next build` pode falhar por EPERM em `.next/trace`. O `dev` é suficiente para validação funcional.
2. Acesse a página `/estrategia` e verifique o console do navegador:
   - Não deve aparecer o warning: `Unsupported metadata viewport is configured in metadata export`.
   - Deve aparecer o log: `Sem Tag carregado: 1723 municípios.` (ou a contagem correspondente do arquivo S3).
3. Abra o DevTools > Network e filtre por `municipios_sem_tag.json`:
   - Requisição para `/api/proxy-geojson/municipios_sem_tag.json` deve retornar `Status 200`.
   - Response `Content-Type: application/json` e payload contendo 1723 registros (normalizados em `features`).
4. No mapa, verifique visualmente:
   - A camada "Sem Tag" (cinza claro) aparece por baixo de Periferia e Polos.
   - O toggle "Sem Tag" liga/desliga a camada.
   - Ao filtrar por UF, a camada sem tag acompanha a UF selecionada.
   - Clique em um município sem tag exibe popup com Município, UF, Código e Valor Total (se existir).

Evidências sugeridas para anexar ao PR
- Screenshot do console sem warnings de viewport.
- Screenshot do Network mostrando a resposta 200 do endpoint e a contagem dos itens.
- Screenshot do mapa com a camada "Sem Tag" ativa e popup exibido.

Notas técnicas
- O endpoint dinâmico `src/app/api/proxy-geojson/[filename]/route.ts` utiliza `getFileFromS3` e não impõe whitelist local, permitindo servir `municipios_sem_tag.json`.
- Caso o arquivo não exista no bucket, o frontend logará uma mensagem de aviso e a camada ficará vazia.
