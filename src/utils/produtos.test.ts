/**
 * Testes unitários para utils/produtos.ts
 * 
 * Cobre todos os casos de elegibilidade de PD e PMSB conforme especificado
 * nas regras de negócio do sistema.
 */

import {
  normalizarTexto,
  isAnoValido,
  temPlanoDiretor,
  isPDVencido,
  temPMSB,
  isPMSBVencido,
  getStatusPD,
  getStatusPMSB,
  podemosVenderPD,
  podemosVenderPMSB,
  classificarElegibilidade,
  gerarTelemetriaVendas,
  PD_VIGENCIA_ANOS,
  PMSB_VIGENCIA_ANOS,
  type PropriedadesMunicipio
} from './produtos';

describe('produtos.ts - Utilitários', () => {
  const anoAtual = 2025;

  describe('normalizarTexto', () => {
    it('deve normalizar texto removendo acentos e convertendo para minúsculas', () => {
      expect(normalizarTexto('São Paulo')).toBe('sao paulo');
      expect(normalizarTexto('JOÃO')).toBe('joao');
      expect(normalizarTexto('  SIM  ')).toBe('sim');
    });

    it('deve retornar string vazia para valores nulos/indefinidos', () => {
      expect(normalizarTexto(null)).toBe('');
      expect(normalizarTexto(undefined)).toBe('');
      expect(normalizarTexto('')).toBe('');
    });

    it('deve remover caracteres especiais', () => {
      expect(normalizarTexto('Não-sei!')).toBe('naose');
      expect(normalizarTexto('Em elaboração')).toBe('em elaboracao');
    });
  });

  describe('isAnoValido', () => {
    it('deve validar anos numéricos válidos', () => {
      expect(isAnoValido(2020)).toBe(true);
      expect(isAnoValido('2015')).toBe(true);
      expect(isAnoValido(2025)).toBe(true);
    });

    it('deve rejeitar anos inválidos', () => {
      expect(isAnoValido(1899)).toBe(false);
      expect(isAnoValido(1800)).toBe(false);
      expect(isAnoValido('abc')).toBe(false);
      expect(isAnoValido(null)).toBe(false);
      expect(isAnoValido(undefined)).toBe(false);
      expect(isAnoValido('-')).toBe(false);
    });

    it('deve aceitar anos futuros próximos (até +10 anos)', () => {
      expect(isAnoValido(2030)).toBe(true);
      expect(isAnoValido(2035)).toBe(true);
      expect(isAnoValido(2050)).toBe(false); // muito futuro
    });
  });

  describe('Plano Diretor (PD)', () => {
    describe('temPlanoDiretor', () => {
      it('deve retornar true quando PD_ALTERADA === "sim"', () => {
        expect(temPlanoDiretor({ PD_ALTERADA: 'sim' })).toBe(true);
        expect(temPlanoDiretor({ PD_ALTERADA: 'SIM' })).toBe(true);
        expect(temPlanoDiretor({ PD_ALTERADA: '  Sim  ' })).toBe(true);
      });

      it('deve retornar false quando não tem PD', () => {
        expect(temPlanoDiretor({ PD_ALTERADA: 'não' })).toBe(false);
        expect(temPlanoDiretor({ PD_ALTERADA: 'nao' })).toBe(false);
        expect(temPlanoDiretor({ PD_ALTERADA: null })).toBe(false);
        expect(temPlanoDiretor({})).toBe(false);
      });
    });

    describe('isPDVencido', () => {
      it('deve retornar true para PD vencido (> 10 anos)', () => {
        const props: PropriedadesMunicipio = {
          PD_ALTERADA: 'sim',
          PD_ANO: 2014 // 2014 + 10 = 2024 < 2025
        };
        expect(isPDVencido(props, anoAtual)).toBe(true);
      });

      it('deve retornar false para PD válido (< 10 anos)', () => {
        const props: PropriedadesMunicipio = {
          PD_ALTERADA: 'sim',
          PD_ANO: 2020 // 2020 + 10 = 2030 >= 2025
        };
        expect(isPDVencido(props, anoAtual)).toBe(false);
      });

      it('deve retornar false no limite (exato 10 anos)', () => {
        const props: PropriedadesMunicipio = {
          PD_ALTERADA: 'sim',
          PD_ANO: 2015 // 2015 + 10 = 2025 (não vencido ainda)
        };
        expect(isPDVencido(props, anoAtual)).toBe(false);
      });

      it('deve retornar false quando não tem PD', () => {
        expect(isPDVencido({ PD_ALTERADA: 'não' }, anoAtual)).toBe(false);
      });

      it('deve lidar com anos inválidos', () => {
        const props: PropriedadesMunicipio = {
          PD_ALTERADA: 'sim',
          PD_ANO: 'inválido'
        };
        expect(isPDVencido(props, anoAtual)).toBe(false);
      });
    });

    describe('getStatusPD', () => {
      it('deve retornar "nao_tem" quando não possui PD', () => {
        expect(getStatusPD({ PD_ALTERADA: 'não' })).toBe('nao_tem');
      });

      it('deve retornar "vencido" quando PD está vencido', () => {
        const props: PropriedadesMunicipio = {
          PD_ALTERADA: 'sim',
          PD_ANO: 2010
        };
        expect(getStatusPD(props, anoAtual)).toBe('vencido');
      });

      it('deve retornar "em_dia" quando PD está válido', () => {
        const props: PropriedadesMunicipio = {
          PD_ALTERADA: 'sim',
          PD_ANO: 2020
        };
        expect(getStatusPD(props, anoAtual)).toBe('em_dia');
      });
    });

    describe('podemosVenderPD', () => {
      it('deve permitir venda quando não tem PD', () => {
        expect(podemosVenderPD({ PD_ALTERADA: 'não' })).toBe(true);
      });

      it('deve permitir venda quando PD vencido', () => {
        const props: PropriedadesMunicipio = {
          PD_ALTERADA: 'sim',
          PD_ANO: 2010
        };
        expect(podemosVenderPD(props, anoAtual)).toBe(true);
      });

      it('deve NÃO permitir venda quando PD válido', () => {
        const props: PropriedadesMunicipio = {
          PD_ALTERADA: 'sim',
          PD_ANO: 2020
        };
        expect(podemosVenderPD(props, anoAtual)).toBe(false);
      });
    });
  });

  describe('PMSB (Plano Municipal de Saneamento Básico)', () => {
    describe('temPMSB', () => {
      it('deve retornar true quando plano_saneamento_existe === "sim"', () => {
        expect(temPMSB({ plano_saneamento_existe: 'sim' })).toBe(true);
        expect(temPMSB({ plano_saneamento_existe: 'SIM' })).toBe(true);
      });

      it('deve retornar true quando plano_saneamento_existe === "em elaboracao"', () => {
        expect(temPMSB({ plano_saneamento_existe: 'em elaboracao' })).toBe(true);
        expect(temPMSB({ plano_saneamento_existe: 'Em Elaboração' })).toBe(true);
      });

      it('deve retornar false quando não tem PMSB', () => {
        expect(temPMSB({ plano_saneamento_existe: 'não' })).toBe(false);
        expect(temPMSB({ plano_saneamento_existe: null })).toBe(false);
        expect(temPMSB({})).toBe(false);
      });
    });

    describe('isPMSBVencido', () => {
      it('deve retornar true para PMSB vencido (> 4 anos)', () => {
        const props: PropriedadesMunicipio = {
          plano_saneamento_existe: 'sim',
          plano_saneamento_ano: 2020 // 2020 + 4 = 2024 < 2025
        };
        expect(isPMSBVencido(props, anoAtual)).toBe(true);
      });

      it('deve retornar false para PMSB válido (< 4 anos)', () => {
        const props: PropriedadesMunicipio = {
          plano_saneamento_existe: 'sim',
          plano_saneamento_ano: 2023 // 2023 + 4 = 2027 >= 2025
        };
        expect(isPMSBVencido(props, anoAtual)).toBe(false);
      });

      it('deve retornar false no limite (exato 4 anos)', () => {
        const props: PropriedadesMunicipio = {
          plano_saneamento_existe: 'sim',
          plano_saneamento_ano: 2021 // 2021 + 4 = 2025 (não vencido ainda)
        };
        expect(isPMSBVencido(props, anoAtual)).toBe(false);
      });

      it('deve retornar false quando status é "em elaboracao"', () => {
        const props: PropriedadesMunicipio = {
          plano_saneamento_existe: 'em elaboracao',
          plano_saneamento_ano: 2010 // mesmo muito antigo
        };
        expect(isPMSBVencido(props, anoAtual)).toBe(false);
      });

      it('deve retornar false quando não tem PMSB', () => {
        expect(isPMSBVencido({ plano_saneamento_existe: 'não' }, anoAtual)).toBe(false);
      });

      it('deve lidar com anos inválidos (-, NA, Recusa)', () => {
        const props1: PropriedadesMunicipio = {
          plano_saneamento_existe: 'sim',
          plano_saneamento_ano: '-'
        };
        expect(isPMSBVencido(props1, anoAtual)).toBe(false);

        const props2: PropriedadesMunicipio = {
          plano_saneamento_existe: 'sim',
          plano_saneamento_ano: 'NA'
        };
        expect(isPMSBVencido(props2, anoAtual)).toBe(false);

        const props3: PropriedadesMunicipio = {
          plano_saneamento_existe: 'sim',
          plano_saneamento_ano: 'Recusa'
        };
        expect(isPMSBVencido(props3, anoAtual)).toBe(false);
      });
    });

    describe('getStatusPMSB', () => {
      it('deve retornar "nao_tem" quando não possui PMSB', () => {
        expect(getStatusPMSB({ plano_saneamento_existe: 'não' })).toBe('nao_tem');
      });

      it('deve retornar "vencido" quando PMSB está vencido', () => {
        const props: PropriedadesMunicipio = {
          plano_saneamento_existe: 'sim',
          plano_saneamento_ano: 2018
        };
        expect(getStatusPMSB(props, anoAtual)).toBe('vencido');
      });

      it('deve retornar "em_dia" quando PMSB está válido', () => {
        const props: PropriedadesMunicipio = {
          plano_saneamento_existe: 'sim',
          plano_saneamento_ano: 2023
        };
        expect(getStatusPMSB(props, anoAtual)).toBe('em_dia');
      });

      it('deve retornar "em_dia" quando em elaboração', () => {
        const props: PropriedadesMunicipio = {
          plano_saneamento_existe: 'em elaboracao'
        };
        expect(getStatusPMSB(props, anoAtual)).toBe('em_dia');
      });
    });

    describe('podemosVenderPMSB', () => {
      it('deve permitir venda quando não tem PMSB', () => {
        expect(podemosVenderPMSB({ plano_saneamento_existe: 'não' })).toBe(true);
      });

      it('deve permitir venda quando PMSB vencido', () => {
        const props: PropriedadesMunicipio = {
          plano_saneamento_existe: 'sim',
          plano_saneamento_ano: 2018
        };
        expect(podemosVenderPMSB(props, anoAtual)).toBe(true);
      });

      it('deve NÃO permitir venda quando PMSB válido', () => {
        const props: PropriedadesMunicipio = {
          plano_saneamento_existe: 'sim',
          plano_saneamento_ano: 2023
        };
        expect(podemosVenderPMSB(props, anoAtual)).toBe(false);
      });

      it('deve NÃO permitir venda quando em elaboração', () => {
        const props: PropriedadesMunicipio = {
          plano_saneamento_existe: 'em elaboracao'
        };
        expect(podemosVenderPMSB(props, anoAtual)).toBe(false);
      });
    });
  });

  describe('classificarElegibilidade', () => {
    it('deve classificar cenário 1: Não tem PD nem PMSB', () => {
      const props: PropriedadesMunicipio = {
        PD_ALTERADA: 'não',
        plano_saneamento_existe: 'não',
        VALOR_PD: 'R$ 150.000',
        VALOR_PMSB: 'R$ 200.000'
      };

      const resultado = classificarElegibilidade(props, anoAtual);

      expect(resultado.vender).toHaveLength(2);
      expect(resultado.naoVender).toHaveLength(0);
      expect(resultado.vender[0].chave).toBe('VALOR_PD');
      expect(resultado.vender[0].status).toBe('nao_tem');
      expect(resultado.vender[1].chave).toBe('VALOR_PMSB');
      expect(resultado.vender[1].status).toBe('nao_tem');
    });

    it('deve classificar cenário 2: Tem PD válido e PMSB válido', () => {
      const props: PropriedadesMunicipio = {
        PD_ALTERADA: 'sim',
        PD_ANO: 2020,
        plano_saneamento_existe: 'sim',
        plano_saneamento_ano: 2023,
        VALOR_PD: 'R$ 150.000',
        VALOR_PMSB: 'R$ 200.000'
      };

      const resultado = classificarElegibilidade(props, anoAtual);

      expect(resultado.vender).toHaveLength(0);
      expect(resultado.naoVender).toHaveLength(2);
      expect(resultado.naoVender[0].status).toBe('em_dia');
      expect(resultado.naoVender[1].status).toBe('em_dia');
    });

    it('deve classificar cenário 3: PD vencido e PMSB vencido', () => {
      const props: PropriedadesMunicipio = {
        PD_ALTERADA: 'sim',
        PD_ANO: 2010,
        plano_saneamento_existe: 'sim',
        plano_saneamento_ano: 2018,
        VALOR_PD: 'R$ 150.000',
        VALOR_PMSB: 'R$ 200.000'
      };

      const resultado = classificarElegibilidade(props, anoAtual);

      expect(resultado.vender).toHaveLength(2);
      expect(resultado.naoVender).toHaveLength(0);
      expect(resultado.vender[0].status).toBe('vencido');
      expect(resultado.vender[1].status).toBe('vencido');
    });

    it('deve classificar cenário 4: PD vencido mas PMSB válido', () => {
      const props: PropriedadesMunicipio = {
        PD_ALTERADA: 'sim',
        PD_ANO: 2012,
        plano_saneamento_existe: 'sim',
        plano_saneamento_ano: 2023,
        VALOR_PD: 'R$ 150.000',
        VALOR_PMSB: 'R$ 200.000'
      };

      const resultado = classificarElegibilidade(props, anoAtual);

      expect(resultado.vender).toHaveLength(1);
      expect(resultado.naoVender).toHaveLength(1);
      expect(resultado.vender[0].chave).toBe('VALOR_PD');
      expect(resultado.vender[0].status).toBe('vencido');
      expect(resultado.naoVender[0].chave).toBe('VALOR_PMSB');
      expect(resultado.naoVender[0].status).toBe('em_dia');
    });

    it('deve incluir anos nos nomes quando disponíveis', () => {
      const props: PropriedadesMunicipio = {
        PD_ALTERADA: 'sim',
        PD_ANO: 2020,
        plano_saneamento_existe: 'sim',
        plano_saneamento_ano: 2022,
        VALOR_PD: 'R$ 150.000',
        VALOR_PMSB: 'R$ 200.000'
      };

      const resultado = classificarElegibilidade(props, anoAtual);

      expect(resultado.naoVender[0].nome).toBe('Plano Diretor - 2020');
      expect(resultado.naoVender[1].nome).toBe('PMSB - 2022');
    });

    it('deve incluir motivos detalhados', () => {
      const props: PropriedadesMunicipio = {
        PD_ALTERADA: 'não',
        plano_saneamento_existe: 'sim',
        plano_saneamento_ano: 2018,
        VALOR_PD: 'R$ 150.000',
        VALOR_PMSB: 'R$ 200.000'
      };

      const resultado = classificarElegibilidade(props, anoAtual);

      expect(resultado.vender[0].motivo).toContain('não possui');
      expect(resultado.vender[1].motivo).toContain('vencido');
      expect(resultado.vender[1].motivo).toContain('2018');
    });
  });

  describe('gerarTelemetriaVendas', () => {
    it('deve gerar telemetria completa', () => {
      const props: PropriedadesMunicipio = {
        PD_ALTERADA: 'não',
        plano_saneamento_existe: 'sim',
        plano_saneamento_ano: 2018,
        VALOR_PD: 'R$ 150.000',
        VALOR_PMSB: 'R$ 200.000'
      };

      const classificacao = classificarElegibilidade(props, anoAtual);
      const telemetria = gerarTelemetriaVendas(classificacao, {
        code_muni: '3550308',
        UF: 'SP'
      });

      expect(telemetria.vender).toBe(2);
      expect(telemetria.naoVender).toBe(0);
      expect(telemetria.produtos_vender).toEqual(['VALOR_PD', 'VALOR_PMSB']);
      expect(telemetria.produtos_nao_vender).toEqual([]);
      expect(telemetria.code_muni).toBe('3550308');
      expect(telemetria.uf).toBe('SP');
    });

    it('deve funcionar sem dados de município', () => {
      const props: PropriedadesMunicipio = {
        PD_ALTERADA: 'sim',
        PD_ANO: 2020,
        plano_saneamento_existe: 'sim',
        plano_saneamento_ano: 2023
      };

      const classificacao = classificarElegibilidade(props, anoAtual);
      const telemetria = gerarTelemetriaVendas(classificacao);

      expect(telemetria.vender).toBe(0);
      expect(telemetria.naoVender).toBe(2);
      expect(telemetria.code_muni).toBeUndefined();
      expect(telemetria.uf).toBeUndefined();
    });
  });

  describe('Casos de borda e edge cases', () => {
    it('deve lidar com ano atual-1 (limite de não vencimento)', () => {
      const propsPD: PropriedadesMunicipio = {
        PD_ALTERADA: 'sim',
        PD_ANO: anoAtual - 1 // ano passado
      };
      expect(isPDVencido(propsPD, anoAtual)).toBe(false);

      const propsPMSB: PropriedadesMunicipio = {
        plano_saneamento_existe: 'sim',
        plano_saneamento_ano: anoAtual - 1
      };
      expect(isPMSBVencido(propsPMSB, anoAtual)).toBe(false);
    });

    it('deve lidar com ano exato de vencimento (limite)', () => {
      const propsPD: PropriedadesMunicipio = {
        PD_ALTERADA: 'sim',
        PD_ANO: anoAtual - PD_VIGENCIA_ANOS // 2015 (exato)
      };
      // 2015 + 10 = 2025 (não vencido, pois >= anoAtual)
      expect(isPDVencido(propsPD, anoAtual)).toBe(false);

      const propsPMSB: PropriedadesMunicipio = {
        plano_saneamento_existe: 'sim',
        plano_saneamento_ano: anoAtual - PMSB_VIGENCIA_ANOS // 2021 (exato)
      };
      // 2021 + 4 = 2025 (não vencido, pois >= anoAtual)
      expect(isPMSBVencido(propsPMSB, anoAtual)).toBe(false);
    });

    it('deve lidar com ano um dia após vencimento', () => {
      const propsPD: PropriedadesMunicipio = {
        PD_ALTERADA: 'sim',
        PD_ANO: anoAtual - PD_VIGENCIA_ANOS - 1 // 2014
      };
      // 2014 + 10 = 2024 < 2025 (vencido)
      expect(isPDVencido(propsPD, anoAtual)).toBe(true);

      const propsPMSB: PropriedadesMunicipio = {
        plano_saneamento_existe: 'sim',
        plano_saneamento_ano: anoAtual - PMSB_VIGENCIA_ANOS - 1 // 2020
      };
      // 2020 + 4 = 2024 < 2025 (vencido)
      expect(isPMSBVencido(propsPMSB, anoAtual)).toBe(true);
    });

    it('deve lidar com propriedades vazias/malformadas', () => {
      expect(podemosVenderPD({})).toBe(true);
      expect(podemosVenderPMSB({})).toBe(true);
      
      const classificacao = classificarElegibilidade({}, anoAtual);
      expect(classificacao.vender).toHaveLength(2);
    });

    it('deve lidar com valores undefined em todas as propriedades', () => {
      const props: PropriedadesMunicipio = {
        PD_ALTERADA: undefined,
        PD_ANO: undefined,
        plano_saneamento_existe: undefined,
        plano_saneamento_ano: undefined
      };

      const classificacao = classificarElegibilidade(props, anoAtual);
      expect(classificacao.vender).toHaveLength(2);
      expect(classificacao.naoVender).toHaveLength(0);
    });
  });
});
