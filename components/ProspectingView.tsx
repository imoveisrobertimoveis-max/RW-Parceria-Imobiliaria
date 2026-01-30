
import React, { useState, useEffect } from 'react';
import { searchOnlineBrokers, searchOnlineCompanies, searchByPhone, searchByEmail } from '../services/geminiService';

interface ProspectingViewProps {
  onImport: (companyData: { name: string; address: string; phone: string; creci?: string; docType?: 'CNPJ' | 'CPF' | 'CRECI'; website?: string }) => void;
}

type SearchType = 'region' | 'phone' | 'broker' | 'email';

export const ProspectingView: React.FC<ProspectingViewProps> = ({ onImport }) => {
  const [query, setQuery] = useState('');
  const [brokerQuery, setBrokerQuery] = useState('');
  const [phoneQuery, setPhoneQuery] = useState('');
  const [emailQuery, setEmailQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentSearchType, setCurrentSearchType] = useState<SearchType>('region');
  const [results, setResults] = useState<{ text: string; sources: any[] } | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('recent_prospecting_queries');
    if (saved) setRecentSearches(JSON.parse(saved));
  }, []);

  const saveQuery = (q: string) => {
    const updated = [q, ...recentSearches.filter(x => x !== q)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recent_prospecting_queries', JSON.stringify(updated));
  };

  const maskPhone = (v: string) => {
    let r = v.replace(/\D/g, "").substring(0, 11);
    if (r.length === 11) {
      return r.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    } else if (r.length > 2) {
      return r.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
    } else if (r.length > 0) {
      return "(" + r;
    }
    return r;
  };

  /**
   * Abre o WhatsApp com uma mensagem de parceria personalizada.
   */
  const openWhatsApp = (data: any) => {
    if (!data.phone) {
      alert("Telefone não identificado para este contato.");
      return;
    }
    
    // Remove caracteres não numéricos para a URL do WhatsApp
    let cleanPhone = data.phone.replace(/\D/g, '');
    
    // Adiciona o DDI 55 (Brasil) se não houver
    if (cleanPhone.length <= 11) {
      cleanPhone = '55' + cleanPhone;
    }

    const isBroker = data.creci !== "" || currentSearchType === 'broker';
    const contactRole = isBroker ? 'corretor autônomo' : 'imobiliária';
    
    const message = `Olá ${data.name}! Sou do PartnerHub. Notei sua forte atuação como ${contactRole} em ${data.address} e gostaria de conversar sobre uma parceria estratégica conosco. Você teria disponibilidade para um breve contato?`;
    
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const performSearch = async (searchQuery: string, type: SearchType = 'region', useGeo: boolean = false) => {
    if (!searchQuery && !useGeo) return;
    
    setLoading(true);
    setResults(null); 
    setCurrentSearchType(type);
    
    if (searchQuery && type === 'region') saveQuery(searchQuery);
    
    try {
      let res;
      let coords: { latitude: number, longitude: number } | undefined;
      
      if (useGeo && type === 'region') {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
          });
          coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          if (!searchQuery) searchQuery = "esta região geográfica";
        } catch (e) {
          alert("Não foi possível obter sua localização. Por favor, digite a região manualmente.");
          setLoading(false);
          return;
        }
      }

      switch (type) {
        case 'phone':
          res = await searchByPhone(searchQuery);
          break;
        case 'broker':
          res = await searchOnlineBrokers(searchQuery);
          break;
        case 'email':
          res = await searchByEmail(searchQuery);
          break;
        default:
          res = await searchOnlineCompanies(searchQuery, coords);
      }

      setResults(res);
    } catch (error) {
      alert("Erro ao realizar busca online com a IA. Verifique sua conexão ou tente novamente mais tarde.");
    } finally {
      setLoading(false);
    }
  };

  const parseCompanyLine = (line: string) => {
    const cleanLine = line.replace(/^\d+\.|\*|-/g, '').trim();
    
    // Suporte para o novo formato com pipes "|"
    if (cleanLine.includes('|')) {
      const parts = cleanLine.split('|').map(p => p.trim());
      const name = parts[0] || "Nome não identificado";
      const address = parts[1] || "Endereço não identificado";
      const phoneRaw = parts[2] || "";
      const websiteRaw = parts[3] || "";
      
      const phone = phoneRaw.toLowerCase().replace('telefone:', '').trim();
      const website = websiteRaw.toLowerCase().replace('website:', '').trim();
      
      return { 
        name, 
        address, 
        phone, 
        creci: "", 
        docType: 'CNPJ' as const, 
        website: website === 'n/a' ? undefined : website 
      };
    }

    // Fallback para o formato antigo
    const isBrokerResult = cleanLine.includes('CRECI:');
    const phonePartIndex = cleanLine.toLowerCase().lastIndexOf('telefone:');
    let mainInfo = cleanLine;
    let phone = "";

    if (phonePartIndex !== -1) {
      mainInfo = cleanLine.substring(0, phonePartIndex).trim();
      phone = cleanLine.substring(phonePartIndex + 9).trim();
    } else {
      const phoneMatch = cleanLine.match(/(\(?\d{2}\)?\s?\d{4,5}-?\d{4})/);
      phone = phoneMatch ? phoneMatch[0] : "";
    }

    const parts = mainInfo.split(' - ');
    const namePart = parts[0]?.trim() || "Nome não identificado";
    
    let creci = "";
    let name = namePart;
    let docType: 'CNPJ' | 'CPF' | 'CRECI' = 'CNPJ';

    if (isBrokerResult) {
      const creciMatch = cleanLine.match(/CRECI:\s?(\d+)/i);
      creci = creciMatch ? creciMatch[1] : "";
      name = namePart.split('(')[0].trim();
      docType = 'CRECI';
    }
    
    let address = parts.length > 1 ? parts.slice(1).join(' - ').trim() : "Endereço não identificado";
    
    return { name, address, phone, creci, docType };
  };

  const resultLines = results?.text.split('\n')
    .filter(line => line.length > 10 && (line.includes('-') || line.includes(':') || line.includes('CRECI:') || line.includes('|'))) || [];

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-fadeIn pb-20">
      {/* Hero Search Section - Enhanced for Dual Focus (PJ and PF) */}
      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-blue-900/5 space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-widest">
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
            Mapeamento de Mercado IA
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Expandir Rede em Larga Escala</h2>
          <p className="text-slate-500 max-w-lg mx-auto text-sm">Utilize nossa IA para varrer portais e redes em busca das melhores imobiliárias e corretores autônomos por região.</p>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Busca por Imobiliárias PJ */}
          <div className="bg-slate-50 p-7 rounded-[2.5rem] border border-slate-200 space-y-5 shadow-sm hover:border-blue-400 transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-2xl shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">🏢</div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Imobiliárias (PJ)</h4>
                  <p className="text-[10px] text-slate-500 font-medium">Foco em empresas e sedes físicas.</p>
                </div>
              </div>
              <button 
                onClick={() => performSearch("", "region", true)}
                disabled={loading}
                className="p-2.5 bg-white border border-slate-200 text-blue-600 rounded-xl hover:bg-blue-50 transition-colors shadow-sm"
                title="Buscar perto de mim"
              >
                📍
              </button>