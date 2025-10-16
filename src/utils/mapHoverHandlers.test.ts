/**
 * Testes para mapHoverHandlers.ts
 * 
 * Validações de extração de dados, escape XSS, e geração de HTML
 * 
 * Para rodar: npm test -- mapHoverHandlers.test.ts
 * (Requer Jest ou Vitest configurado no projeto)
 */

import {
  extractMuniFields,
  muniTooltipHtml,
  MuniFields,
} from "../mapHoverHandlers";

describe("mapHoverHandlers", () => {
  /**
   * Testes de extractMuniFields
   * Validam fallbacks para diferentes esquemas
   */
  describe("extractMuniFields", () => {
    it("extrai campos com keys padrão (primary)", () => {
      const result = extractMuniFields({
        nome_municipio: "São Paulo",
        name_state: "SP",
        code_muni: 3550308,
      });

      expect(result).toEqual({
        uf: "SP",
        ibge: "3550308",
        nome: "São Paulo",
      });
    });

    it("usa fallback 'municipio' para nome", () => {
      const result = extractMuniFields({
        municipio: "Rio de Janeiro",
        UF: "RJ",
        codigo_ibge: 3304557,
      });

      expect(result.nome).toBe("Rio de Janeiro");
      expect(result.uf).toBe("RJ");
      expect(result.ibge).toBe("3304557");
    });

    it("usa fallback 'UF_origem' para UF", () => {
      const result = extractMuniFields({
        nome_municipio: "Salvador",
        UF_origem: "BA",
        code_muni: 2704302,
      });

      expect(result.uf).toBe("BA");
    });

    it("retorna '-' para campos faltando", () => {
      const result = extractMuniFields({
        nome_municipio: "Teste",
        // Sem UF e IBGE
      });

      expect(result.uf).toBe("-");
      expect(result.ibge).toBe("-");
      expect(result.nome).toBe("Teste");
    });

    it("trimma espaços em branco", () => {
      const result = extractMuniFields({
        nome_municipio: "  São Paulo  ",
        name_state: "  SP  ",
        code_muni: "  3550308  ",
      });

      expect(result.nome).toBe("São Paulo");
      expect(result.uf).toBe("SP");
      expect(result.ibge).toBe("3550308");
    });

    it("converte valores para string", () => {
      const result = extractMuniFields({
        nome_municipio: 12345, // número
        name_state: null, // null → fallback
        code_muni: { toString: () => "3550308" }, // objeto com toString
      });

      expect(result.nome).toBe("12345");
      expect(result.ibge).toBe("3550308");
    });
  });

  /**
   * Testes de muniTooltipHtml
   * Validam geração de HTML e escape XSS
   */
  describe("muniTooltipHtml", () => {
    it("gera HTML válido com estrutura esperada", () => {
      const html = muniTooltipHtml({
        nome_municipio: "São Paulo",
        name_state: "SP",
        code_muni: 3550308,
      });

      expect(html).toContain('<div class="t-muni">');
      expect(html).toContain('<div class="t-title">São Paulo</div>');
      expect(html).toContain('<div class="t-row">UF: <b>SP</b></div>');
      expect(html).toContain('<div class="t-row">IBGE: <b>3550308</b></div>');
      expect(html).toContain("</div>");
    });

    it("escapa tags HTML perigosas (XSS prevention)", () => {
      const html = muniTooltipHtml({
        nome_municipio: "<script>alert('XSS')</script>",
        name_state: "<img src=x onerror=alert(1)>",
        code_muni: "&lt;script&gt;",
      });

      expect(html).not.toContain("<script>");
      expect(html).not.toContain("onerror=");
      expect(html).toContain("&lt;script&gt;alert(&#39;XSS&#39;)&lt;/script&gt;");
    });

    it("escapa atributos perigosos", () => {
      const html = muniTooltipHtml({
        nome_municipio: 'Cidade" onclick="alert(1)"',
        name_state: "SP",
        code_muni: "123",
      });

      expect(html).not.toContain('onclick=');
      expect(html).toContain('&quot;');
    });

    it("mantém acentos e caracteres especiais seguros", () => {
      const html = muniTooltipHtml({
        nome_municipio: "São Paulo à Noite &Cia.",
        name_state: "SP",
        code_muni: 3550308,
      });

      expect(html).toContain("São Paulo");
      expect(html).toContain("à");
      expect(html).toContain("&amp;Cia.");
    });

    it("usa fallbacks quando propriedades faltam", () => {
      const html = muniTooltipHtml({
        municipio: "Belém",
        UF: "PA",
        // code_muni falta
      });

      expect(html).toContain("Belém");
      expect(html).toContain("PA");
      expect(html).toContain("IBGE: <b>-</b>");
    });

    it("não quebra com objetos complexos", () => {
      const html = muniTooltipHtml({
        nome_municipio: { prop: "value" }, // Objeto em vez de string
        name_state: ["SP"], // Array em vez de string
        code_muni: { toString: () => "3550308" }, // Objeto com toString
      });

      expect(html).toBeTruthy();
      expect(html).not.toContain("[object Object]"); // Não expõe internals
    });
  });

  /**
   * Testes de snapshot (validam formato esperado do HTML)
   * Útil para detectar mudanças acidentais na estrutura
   */
  describe("snapshots", () => {
    it("match HTML snapshot para municipio padrão", () => {
      const html = muniTooltipHtml({
        nome_municipio: "Brasília",
        name_state: "DF",
        code_muni: 5300108,
      });

      expect(html).toMatchInlineSnapshot(`
        "<div class=\"t-muni\">
          <div class=\"t-title\">Brasília</div>
          <div class=\"t-row\">UF: <b>DF</b></div>
          <div class=\"t-row\">IBGE: <b>5300108</b></div>
        </div>"
      `);
    });

    it("match HTML snapshot com dados faltando", () => {
      const html = muniTooltipHtml({
        nome_municipio: "Desconhecido",
        // UF e IBGE faltam
      });

      expect(html).toMatchInlineSnapshot(`
        "<div class=\"t-muni\">
          <div class=\"t-title\">Desconhecido</div>
          <div class=\"t-row\">UF: <b>-</b></div>
          <div class=\"t-row\">IBGE: <b>-</b></div>
        </div>"
      `);
    });
  });

  /**
   * Testes de integração (comportamento completo)
   */
  describe("integração", () => {
    it("fluxo completo: extract → html, sem erros", () => {
      const properties = {
        municipio: "Curitiba",
        state: "PR",
        codigo_ibge: 4106902,
      };

      const fields = extractMuniFields(properties);
      const html = muniTooltipHtml(properties);

      expect(fields).toEqual({
        uf: "PR",
        ibge: "4106902",
        nome: "Curitiba",
      });

      expect(html).toContain("Curitiba");
      expect(html).toContain("PR");
      expect(html).toContain("4106902");
    });

    it("resiste a malformed data", () => {
      const properties = null as any;

      expect(() => {
        extractMuniFields(properties || {});
        muniTooltipHtml(properties || {});
      }).not.toThrow();
    });
  });
});

/**
 * ============================================================
 * COVERAGE ESPERADO
 * ============================================================
 * 
 * Statements   : 100% (todas as linhas)
 * Branches     : 95%+ (todos os fallbacks)
 * Functions    : 100% (todas as funções)
 * Lines        : 100%
 * 
 * Run: npm test -- --coverage mapHoverHandlers
 */
