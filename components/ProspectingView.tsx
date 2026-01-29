
import React, { useState, useEffect } from 'react';
import { searchOnlineCompanies, searchByPhone, searchByEmail, searchOnlineBrokers } from '../services/geminiService';

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

  const openWhatsApp = (data: any) => {
    if (!data.phone) return;
    const cleanPhone = data.phone.replace(/\D/g, '');
    const message = `Olá ${data.name}, sou do PartnerHub. Vi sua atuação em ${data.address} e gostaria de conversar sobre uma possível parceria. Teria um momento?`;
    const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
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
            </div>
            <form onSubmit={(e) => { e.preventDefault(); performSearch(query, 'region'); }} className="space-y-3">
              <input 
                type="text" 
                placeholder="Ex: Pinheiros, São Paulo..." 
                className="w-full h-14 px-5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold shadow-inner"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading}
              />
              <button 
                type="submit" 
                disabled={loading || !query}
                className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading && currentSearchType === 'region' ? 'Varrendo Região...' : 'Escanear Imobiliárias'}
              </button>
            </form>
          </div>

          {/* Busca por Corretores PF */}
          <div className="bg-amber-50/20 p-7 rounded-[2.5rem] border border-amber-100 space-y-5 shadow-sm hover:border-amber-400 transition-all group ring-1 ring-amber-50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center text-2xl shadow-sm group-hover:bg-amber-600 group-hover:text-white transition-all">👤</div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-amber-600">Corretores (PF)</h4>
                <p className="text-[10px] text-amber-500 font-medium">Foco em profissionais autônomos.</p>
              </div>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if(brokerQuery) performSearch(brokerQuery, 'broker'); }} className="space-y-3">
              <input 
                type="text" 
                placeholder="Ex: Corretores autônomos Curitiba..." 
                className="w-full h-14 px-5 bg-white border border-amber-200 rounded-2xl outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all text-sm font-bold text-amber-900 placeholder:text-amber-200 shadow-inner"
                value={brokerQuery}
                onChange={(e) => setBrokerQuery(e.target.value)}
                disabled={loading}
              />
              <button 
                type="submit" 
                disabled={loading || !brokerQuery}
                className="w-full h-14 bg-amber-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-amber-100 hover:bg-amber-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading && currentSearchType === 'broker' ? 'Localizando Profissionais...' : 'Buscar Corretores PF'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Rastreio por Telefone */}
        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-xl shadow-emerald-900/5 space-y-4 ring-1 ring-emerald-50">
          <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
            <span className="text-lg">📱</span> Identificação Reversa
          </h4>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="(00) 00000-0000" 
              className="flex-1 h-12 px-4 bg-emerald-50 border border-emerald-100 rounded-xl outline-none text-sm font-bold text-emerald-900 placeholder:text-emerald-300 disabled:opacity-50"
              value={phoneQuery}
              onChange={(e) => setPhoneQuery(maskPhone(e.target.value))}
              disabled={loading}
            />
            <button 
              onClick={(e) => { e.preventDefault(); if(phoneQuery) performSearch(phoneQuery, 'phone'); }}
              disabled={loading || !phoneQuery}
              className="px-6 h-12 bg-emerald-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95 disabled:opacity-50"
            >
              {loading && currentSearchType === 'phone' ? '...' : 'Rastrear'}
            </button>
          </div>
        </div>

        {/* Rastreio por E-mail */}
        <div className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-xl shadow-indigo-900/5 space-y-4 ring-1 ring-indigo-50">
          <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
            <span className="text-lg">📧</span> Origem por E-mail
          </h4>
          <div className="flex gap-2">
            <input 
              type="email" 
              placeholder="exemplo@imobiliaria.com.br" 
              className="flex-1 h-12 px-4 bg-indigo-50 border border-indigo-100 rounded-xl outline-none text-sm font-bold text-indigo-900 placeholder:text-indigo-300 disabled:opacity-50"
              value={emailQuery}
              onChange={(e) => setEmailQuery(e.target.value)}
              disabled={loading}
            />
            <button 
              onClick={(e) => { e.preventDefault(); if(emailQuery) performSearch(emailQuery, 'email'); }}
              disabled={loading || !emailQuery}
              className="px-6 h-12 bg-indigo-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-50"
            >
              {loading && currentSearchType === 'email' ? '...' : 'Identificar'}
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="py-20 text-center space-y-6">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 border-[6px] border-slate-100 rounded-full"></div>
            <div className="absolute inset-0 border-[6px] border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-4xl">📡</div>
          </div>
          <div className="space-y-1">
            <p className="text-xl font-black text-slate-900">Sincronizando com Radar IA...</p>
            <p className="text-sm text-slate-400 font-medium">Extraindo registros de classe, portais e redes profissionais.</p>
          </div>
        </div>
      )}

      {results && (
        <div className="animate-slideUp space-y-6">
          <div className="flex justify-between items-center px-4">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <span className={`px-3 py-1 rounded-lg ${currentSearchType === 'broker' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                {resultLines.length || 0}
              </span>
              {currentSearchType === 'broker' ? 'Corretores Individuais Localizados' : 'Resultados do Radar'}
            </h3>
            <button onClick={() => setResults(null)} className="text-xs font-bold text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors">Limpar Resultados</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {resultLines.length > 0 ? resultLines.map((line, idx) => {
              const data = parseCompanyLine(line);
              const isBroker = data.creci !== "" || line.toLowerCase().includes('corretor') || currentSearchType === 'broker';

              return (
                <div key={idx} className="group bg-white p-6 rounded-[2.5rem] border border-slate-200 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-900/5 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                  <div className="flex-1 min-w-0 flex items-start gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm ${isBroker ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                      {isBroker ? '👤' : '🏢'}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <h5 className="text-lg font-black text-slate-900 group-hover:text-blue-600 truncate transition-colors">
                        {data.name} 
                        {data.creci && <span className="ml-2 text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100 font-black uppercase">CRECI PF: {data.creci}</span>}
                      </h5>
                      <p className="text-xs text-slate-500 font-medium truncate">{data.address}</p>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {data.phone && (
                          <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 uppercase tracking-widest">{data.phone}</span>
                        )}
                        {data.website && (
                          <a 
                            href={data.website.startsWith('http') ? data.website : `https://${data.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 uppercase tracking-widest hover:bg-indigo-100 transition-colors"
                          >
                            🌐 WEBSITE
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                    <button 
                      onClick={() => openWhatsApp(data)}
                      disabled={!data.phone}
                      className="w-full sm:w-auto h-12 px-6 bg-emerald-500 text-white rounded-xl text-[10px] font-black hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-emerald-100"
                    >
                      <span className="text-lg">💬</span> CONTATO
                    </button>
                    <button 
                      onClick={() => onImport(data)}
                      className="w-full sm:w-auto h-12 px-6 bg-slate-900 text-white rounded-xl text-[10px] font-black hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      <span>📥</span> IMPORTAR
                    </button>
                  </div>
                </div>
              );
            }) : (
              <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                <div className="text-5xl mb-4 grayscale opacity-40">🕵️‍♂️</div>
                <h4 className="text-xl font-bold text-slate-400">Nenhum registro encontrado nesta fonte.</h4>
                <p className="text-sm text-slate-400 mt-2">Tente ajustar os termos da busca ou detalhar melhor a região.</p>
              </div>
            )}
          </div>

          {results.sources.length > 0 && (
            <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white">
              <div className="flex items-center gap-3 mb-6">
                <span className="bg-white/10 p-2 rounded-lg">🔗</span>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Grounding e Fontes Oficiais</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {results.sources.map((chunk, idx) => (chunk.maps || chunk.web) && (
                  <a 
                    key={idx} 
                    href={chunk.maps?.uri || chunk.web?.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-blue-500/50 transition-all text-[10px] font-bold text-slate-300 truncate flex items-center gap-2"
                  >
                    <span>{chunk.maps ? '📍' : '🌐'}</span> {chunk.maps?.title || chunk.web?.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
