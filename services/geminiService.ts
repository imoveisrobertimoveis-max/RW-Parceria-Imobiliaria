
import { GoogleGenAI, Type } from "@google/genai";
import { Company } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAIInsights = async (companies: Company[]) => {
  if (companies.length === 0) return "Adicione empresas para obter insights da IA.";

  const companySummary = companies.map(c => 
    `${c.name} (Corretores: ${c.brokerCount}, Comissão: ${c.commissionRate}%, Contratado por: ${c.hiringManager})`
  ).join(", ");

  const prompt = `Analise a seguinte lista de imobiliárias parceiras e forneça um resumo estratégico. 
  Considere o tamanho da rede (corretores), as taxas de comissão negociadas (1% a 8%) e os responsáveis internos pela contratação para identificar padrões de sucesso ou necessidade de revisão de acordos. 
  Forneça sugestões práticas para maximizar o ROI da rede e engajamento dos parceiros.
  Lista: ${companySummary}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.9,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Não foi possível gerar insights no momento.";
  }
};

export const searchOnlineCompanies = async (region: string, userCoords?: { latitude: number, longitude: number }) => {
  const prompt = `Realize uma busca exaustiva por empresas imobiliárias na região de ${region}. 
  Para cada empresa encontrada, você DEVE retornar obrigatoriamente:
  1. Nome da Imobiliária
  2. Endereço Completo
  3. Telefone de Contato (e WhatsApp se disponível)
  4. Website (se houver)
  
  Formate cada empresa em uma linha seguindo EXATAMENTE o padrão: "Nome da Empresa | Endereço | Telefone: (00) 00000-0000 | Website: url".
  Se não houver website, coloque Website: N/A.
  Priorize imobiliárias ativas e com presença digital.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: userCoords
          }
        }
      },
    });

    const text = response.text || "";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return {
      text,
      sources: groundingChunks
    };
  } catch (error) {
    console.error("Search Error:", error);
    throw error;
  }
};

export const searchOnlineBrokers = async (region: string) => {
  const prompt = `Localize corretores de imóveis autônomos ou profissionais de destaque na região de ${region}. 
  Para cada profissional encontrado, tente retornar:
  1. Nome Completo do Corretor
  2. Número do CRECI (se disponível publicamente)
  3. Área de atuação ou especialidade
  4. Telefone de Contato
  
  Formate cada resultado em uma linha seguindo o padrão: "Nome do Corretor (CRECI: 0000) - Especialidade - Telefone: (00) 00000-0000".
  Se o CRECI não for encontrado, coloque (CRECI: N/A).`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      },
    });

    const text = response.text || "";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return {
      text,
      sources: groundingChunks
    };
  } catch (error) {
    console.error("Broker Search Error:", error);
    throw error;
  }
};

export const searchByPhone = async (phoneNumber: string) => {
  const prompt = `IDENTIFICAÇÃO REVERSA: Quem é o proprietário do telefone ${phoneNumber}? 
  Foque exclusivamente no mercado imobiliário. Verifique portais como ZAP, VivaReal, redes sociais e registros de empresas.
  
  Se encontrar uma imobiliária ou corretor associado, responda EXATAMENTE neste formato em uma única linha:
  "Nome da Imobiliária ou Corretor - Endereço Completo (se disponível) - Telefone: ${phoneNumber}"
  
  Caso seja um corretor individual, adicione o CRECI se possível no nome. Se não encontrar nada relacionado ao mercado imobiliário, informe que o número não possui registros públicos neste setor.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      },
    });

    const text = response.text || "";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return {
      text,
      sources: groundingChunks
    };
  } catch (error) {
    console.error("Phone Search Error:", error);
    throw error;
  }
};

export const searchByEmail = async (email: string) => {
  const prompt = `Identifique a empresa imobiliária associada ao endereço de e-mail: ${email}.
  Retorne as seguintes informações se encontradas publicamente:
  1. Nome da Imobiliária (Razão Social ou Nome Fantasia)
  2. Endereço Completo da sede
  3. Telefone de Contato Principal
  4. Website ou domínio associado ao e-mail
  
  Formate o resultado principal em uma única linha como: "Nome da Empresa - Endereço - Telefone: (00) 00000-0000".
  Se houver mais informações relevantes sobre o porte da empresa, adicione abaixo.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      },
    });

    const text = response.text || "";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return {
      text,
      sources: groundingChunks
    };
  } catch (error) {
    console.error("Email Search Error:", error);
    throw error;
  }
};
