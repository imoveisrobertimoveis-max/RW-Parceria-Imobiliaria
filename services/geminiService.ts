
import { GoogleGenAI, Type } from "@google/genai";
import { Company } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Consulta dados da empresa via BrasilAPI (CNPJ)
 */
export const fetchCompanyByCNPJ = async (cnpj: string) => {
  const cleanCnpj = cnpj.replace(/\D/g, '');
  if (cleanCnpj.length !== 14) return null;

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Erro ao buscar CNPJ:", error);
    return null;
  }
};

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

export const searchOnlineCompanies = async (regionOrName: string, userCoords?: { latitude: number, longitude: number }) => {
  const prompt = `Realize uma busca exaustiva por empresas imobiliárias. O termo de busca fornecido é: "${regionOrName}". 
  Este termo pode ser uma região geográfica ou o nome de uma imobiliária específica.
  
  Para cada empresa encontrada, você DEVE retornar obrigatoriamente:
  1. Nome da Imobiliária (Sem prefixos como 'Imobiliária X')
  2. Endereço Completo (FORMATO OBRIGATÓRIO: Logradouro, Número - Bairro - Cidade/UF)
  3. Telefone de Contato
  4. Website (se houver)
  
  Formate cada empresa em uma única linha seguindo o padrão: "NOME | LOGRADOURO, NUMERO - BAIRRO - CIDADE/UF | Telefone: (00) 00000-0000 | Website: url".
  Se o termo for um nome de empresa, retorne todas as unidades ou informações detalhadas dessa empresa específica.`;

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
  const prompt = `Localize corretores de imóveis autônomos na região de ${region}. 
  Para cada profissional encontrado, você DEVE retornar:
  1. Nome Completo
  2. Endereço ou Área de Atuação (FORMATO: Rua, Número ou 'Atendimento Local' - Bairro - Cidade/UF)
  3. Telefone de Contato
  4. Número do CRECI (Se houver)
  
  Formate cada resultado em uma única linha: "NOME | ENDEREÇO | Telefone: (00) 00000-0000 | CRECI: 00000".`;

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
  Foque exclusivamente no mercado imobiliário. 
  
  Retorne no formato: "NOME | ENDEREÇO (Logradouro, Número - Bairro - Cidade/UF) | Telefone: ${phoneNumber}"`;

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
  const prompt = `Identifique a empresa imobiliária associada ao e-mail: ${email}.
  Retorne no formato: "NOME | ENDEREÇO (Logradouro, Número - Bairro - Cidade/UF) | Telefone: (00) 00000-0000"`;

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

export const searchByWebsite = async (url: string) => {
  const prompt = `Extraia informações comerciais da imobiliária dona do website: ${url}. 
  Ignore se for um portal de anúncios (como VivaReal). Foque em sites de imobiliárias próprias.
  
  Retorne no formato: "NOME | ENDEREÇO (Logradouro, Número - Bairro - Cidade/UF) | Telefone: (00) 00000-0000 | Website: ${url}"`;

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
    console.error("Website Search Error:", error);
    throw error;
  }
};
