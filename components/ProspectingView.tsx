
import React, { useState, useEffect } from 'react';
import { searchOnlineBrokers, searchOnlineCompanies, searchByPhone, searchByEmail, searchByWebsite } from '../services/geminiService';

interface ProspectingViewProps {
  onImport: (companyData: { name: string; address: string; phone: string; creci?: string; docType?: 'CNPJ' | 'CPF' | 'CRECI'; website?: string }) => void;
}

type SearchType = 'region' | 'phone' | 'broker' | 'email' | 'name' | 'website';

export const ProspectingView: React.FC<ProspectingViewProps> = ({ onImport }) => {
  const [query, setQuery] = useState('');
  const [nameQuery, setNameQuery] = useState('');
  const [brokerQuery, setBrokerQuery] = useState('');
  const [phoneQuery, setPhoneQuery] = useState('');
  const [emailQuery, setEmailQuery] = useState('');
  const [websiteQuery, setWebsiteQuery] = useState('');
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
    if (!data.phone) {
      alert("Telefone não identificado para este contato.");
      return;
    }
    
    let cleanPhone = data.phone.replace(/\D/g, '');
    if (cleanPhone.length <= 11) {
      cleanPhone = '55' + cleanPhone;
    }

    const isBroker = data.creci !== "" || currentSearchType === 'broker' || data.name.toLowerCase().includes('corretor');
    const hasAddress = data.address && data.address !== "Endereço não identificado";
    
    let message = "";
    if (isBroker) {
      message = `Olá ${data.name}, vi seu perfil profissional e gostaria de entender melhor sobre parcerias estratégicas.`;
    } else if (hasAddress) {
      message = `Olá ${data.name}, vi sua atuação em ${data.address} e gostaria de conversar sobre uma possível parceria estratégica com o PartnerHub.`;
    } else {
      message = "Olá, gostaria de informações sobre parcerias estratégicas.";
    }
    
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const performSearch = async (searchQuery: string, type: SearchType = 'region', useGeo: boolean = false) => {
    if (!searchQuery && !useGeo) return;
    
    setLoading(true);
    setResults(null); 
    setCurrentSearchType(type);
    
    if (searchQuery && (type === 'region' || type === 'name' || type === 'website')) saveQuery(searchQuery);
    
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
        case 'name':
          res = await searchOnlineCompanies(searchQuery, coords);
          break;
        case 'website':
          res = await searchByWebsite(searchQuery);
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
    let cleanLine = line.replace(/^\d+\.|\*|-/g, '').trim();
    
    const phoneRegex = /(?:telefone|contato|fone|whatsapp):?\s*(\(?\d{2}\)?\s?\d{4,5}-?\d{4})/i;
    const websiteRegex = /(?:website|site|url):?\s*((?:https?:\/\/)?(?:www\.)?[\w\.-]+\.[a-z]{2,}(?:\/[\w\.-]*)*)/i;
    const creciRegex = /creci(?:\s?pf)?:\s*(\d+)/i;

    const phoneMatch = cleanLine.match(phoneRegex);
    const websiteMatch = cleanLine.match(websiteRegex);
    const creciMatch = cleanLine.match(creciRegex);

    const phone = phoneMatch ? phoneMatch[1] : "";
    let website = websiteMatch ? websiteMatch[1] : undefined;
    if (website?.toLowerCase() === 'n/a' || website?.toLowerCase() === 'n/d') website = undefined;
    const creci = creciMatch ? creciMatch[1] : "";

    let remaining = cleanLine
      .replace(phoneRegex, '')
      .replace(websiteRegex, '')
      .replace(creciRegex, '')
      .trim();

    let name = "Nome não identificado";
    let address = "Endereço não identificado";

    if (remaining.includes('|')) {
      const parts = remaining.split('|').map(p => p.trim()).filter(p => p.length > 0);
      name = parts[0].replace(/^(?:nome|razão social|empresa):\s*/i, '');
      address = parts.slice(1).join(' - ');
    } else {
      const parts = remaining.split(/\s+-\s+|\s{3,}/).map(p => p.trim()).filter(p => p.length > 0);
      if (parts.length >= 2) {
        name = parts[0];
        address = parts.slice(1).join(' - ');
      } else {
        const firstComma = remaining.indexOf(',');
        if (firstComma > 8) {
           name = remaining.substring(0, firstComma).trim();
           address = remaining.substring(firstComma + 1).trim();
        } else {
           name = remaining;
        }
      }
    }

    address = address.replace(/^(?:endereço|local|localização|situa-se em):\s*/i, '').trim();

    return { 
      name: name.trim(), 
      address: address.trim(), 
      phone, 
      creci, 
      docType: creci ? 'CRECI' : 'CNPJ' as 'CRECI' | 'CNPJ',
      website
    };
  };

  const resultLines = results?.text.split('\n')
    .filter(line => line.length > 15 && (line.includes('-') || line.includes(':') || line.includes('CRECI:') || line.includes('|'))) || [];

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-fadeIn pb-20">
      <div className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-2xl shadow-blue-900/5 space-y-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-100">
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
            Inteligência de Mercado Ativa
          </div>
          <h2 className="text-5xl font-black text-slate-900 tracking-tight">Expansão de Rede</h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-base font-medium">Capture leads imobiliários e parceiros estratégicos em tempo real utilizando processamento de linguagem natural e geolocalização.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Busca por Nome (Destaque conforme pedido) */}
          <div className="bg-indigo-50/50 p-8 rounded-[2.5rem] border-2 border-indigo-200 space-y-6 shadow-xl hover:border-indigo-400 transition-all group ring-4 ring-indigo-50/20">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-3xl shadow-lg transition-all">🏢</div>
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-widest text-indigo-600">Por Nome</h4>
                <p className="text-xs text-indigo-500 font-bold">Imobiliária Específica</p>
              </div>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if(nameQuery) performSearch(nameQuery, 'name'); }} className="space-y-4">
              <input 
                type="text" 
                placeholder="Ex: Remax, Lopes, Imobiliária X" 
                className="w-full h-14 px-6 bg-white border border-indigo-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-bold text-indigo-900 shadow-inner"
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                disabled={loading}
              />
              <button 
                type="submit" 
                disabled={loading || !nameQuery}
                className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading && currentSearchType === 'name' ? 'Pesquisando...' : 'Buscar Imobiliária ✓'}
              </button>
            </form>
          </div>

          {/* Busca por Região */}
          <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 space-y-6 shadow-sm hover:border-blue-400 transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-3xl shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">📍</div>
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Por Região</h4>
                  <p className="text-xs text-slate-500 font-bold">Cidades e Bairros</p>
                </div>
              </div>
              <button 
                onClick={() => performSearch("", "region", true)}
                disabled={loading}
                className="p-3 bg-white border border-slate-200 text-blue-600 rounded-xl hover:bg-blue-50 transition-colors shadow-sm"
                title="Detectar minha localização"
              >
                📡
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); performSearch(query, 'region'); }} className="space-y-4">
              <input 
                type="text" 
                placeholder="Ex: Jardins, SP..." 
                className="w-full h-14 px-6 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold shadow-inner"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading}
              />
              <button 
                type="submit" 
                disabled={loading || !query}
                className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading && currentSearchType === 'region' ? '...' : 'Escanear Região'}
              </button>
            </form>
          </div>

          {/* Busca por Website */}
          <div className="bg-violet-50/30 p-8 rounded-[2.5rem] border border-violet-100 space-y-6 shadow-sm hover:border-violet-400 transition-all group ring-1 ring-violet-50/50">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-violet-100 text-violet-600 rounded-2xl flex items-center justify-center text-3xl shadow-sm group-hover:bg-violet-600 group-hover:text-white transition-all">🌐</div>
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-widest text-violet-600">Por Website</h4>
                <p className="text-xs text-violet-500 font-bold">Domínios .com.br</p>
              </div>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if(websiteQuery) performSearch(websiteQuery, 'website'); }} className="space-y-4">
              <input 
                type="text" 
                placeholder="Ex: www.empresa.com.br" 
                className="w-full h-14 px-6 bg-white border border-violet-200 rounded-2xl outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-sm font-bold text-violet-900 shadow-inner"
                value={websiteQuery}
                onChange={(e) => setWebsiteQuery(e.target.value)}
                disabled={loading}
              />
              <button 
                type="submit" 
                disabled={loading || !websiteQuery}
                className="w-full h-14 bg-violet-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-violet-100 hover:bg-violet-700 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading && currentSearchType === 'website' ? '...' : 'Rastrear Site'}
              </button>
            </form>
          </div>

          {/* Busca por Corretores */}
          <div className="bg-amber-50/30 p-8 rounded-[2.5rem] border border-amber-100 space-y-6 shadow-sm hover:border-amber-400 transition-all group ring-1 ring-amber-50/50">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center text-3xl shadow-sm group-hover:bg-amber-600 group-hover:text-white transition-all">👤</div>
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-widest text-amber-600">Corretores PF</h4>
                <p className="text-xs text-amber-500 font-bold">Autônomos / CRECI</p>
              </div>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if(brokerQuery) performSearch(brokerQuery, 'broker'); }} className="space-y-4">
              <input 
                type="text" 
                placeholder="Ex: Corretores em SP..." 
                className="w-full h-14 px-6 bg-white border border-amber-200 rounded-2xl outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all text-sm font-bold text-amber-900 shadow-inner"
                value={brokerQuery}
                onChange={(e) => setBrokerQuery(e.target.value)}
                disabled={loading}
              />
              <button 
                type="submit" 
                disabled={loading || !brokerQuery}
                className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-black active:scale-95 transition-all disabled:opacity-50"
              >
                {loading && currentSearchType === 'broker' ? '...' : 'Filtrar'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Busca Reversa */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-emerald-100 shadow-xl shadow-emerald-900/5 space-y-5 ring-1 ring-emerald-50">
          <h4 className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em] flex items-center gap-3">
            <span className="text-2xl">📱</span> Identificação Reversa por Telefone
          </h4>
          <form 
            className="flex gap-3" 
            onSubmit={(e) => { e.preventDefault(); if(phoneQuery) performSearch(phoneQuery, 'phone'); }}
          >
            <div className="flex-1 relative">
              <input 
                type="text" 
                placeholder="(00) 00000-0000" 
                className="w-full h-14 px-6 bg-emerald-50/50 border border-emerald-100 rounded-2xl outline-none text-sm font-bold text-emerald-900 placeholder:text-emerald-300 disabled:opacity-50 focus:bg-white transition-all"
                value={phoneQuery}
                onChange={(e) => setPhoneQuery(maskPhone(e.target.value))}
                disabled={loading}
              />
            </div>
            <button 
              type="submit" 
              disabled={loading || !phoneQuery}
              className="px-8 h-14 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {loading && currentSearchType === 'phone' ? '...' : 'Rastrear'}
            </button>
          </form>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-indigo-100 shadow-xl shadow-indigo-900/5 space-y-5 ring-1 ring-indigo-50">
          <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-3">
            <span className="text-2xl">📧</span> Origem por Domínio/E-mail
          </h4>
          <form 
            className="flex gap-3"
            onSubmit={(e) => { e.preventDefault(); if(emailQuery) performSearch(emailQuery, 'email'); }}
          >
            <input 
              type="email" 
              placeholder="contato@empresa.com.br" 
              className="flex-1 h-14 px-6 bg-indigo-50/50 border border-indigo-100 rounded-2xl outline-none text-sm font-bold text-indigo-900 placeholder:text-indigo-300 disabled:opacity-50 focus:bg-white transition-all"
              value={emailQuery}
              onChange={(e) => setEmailQuery(e.target.value)}
              disabled={loading}
            />
            <button 
              type="submit" 
              disabled={loading || !emailQuery}
              className="px-8 h-14 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {loading && currentSearchType === 'email' ? '...' : 'Identificar'}
            </button>
          </form>
        </div>
      </div>

      {loading && (
        <div className="py-32 text-center space-y-8 animate-fadeIn">
          <div className="relative w-32 h-32 mx-auto">
            <div className="absolute inset-0 border-[8px] border-slate-100 rounded-[2.5rem]"></div>
            <div className="absolute inset-0 border-[8px] border-blue-600 border-t-transparent rounded-[2.5rem] animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-5xl">📡</div>
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-black text-slate-900 tracking-tight">PartnerHub Radar Ativo...</p>
            <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Extraindo metadados comerciais e contatos estratégicos</p>
          </div>
        </div>
      )}

      {results && (
        <div className="animate-slideUp space-y-8">
          <div className="flex justify-between items-center px-6">
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-4">
              <span className={`px-4 py-1.5 rounded-2xl border ${currentSearchType === 'broker' ? 'bg-amber-100 text-amber-600 border-amber-200' : (currentSearchType === 'website' ? 'bg-violet-100 text-violet-600 border-violet-200' : 'bg-blue-100 text-blue-600 border-blue-200')}`}>
                {resultLines.length || 0}
              </span>
              Oportunidades Encontradas
            </h3>
            <button onClick={() => setResults(null)} className="text-[11px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors">Limpar Busca</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {resultLines.length > 0 ? resultLines.map((line, idx) => {
              const data = parseCompanyLine(line);
              const isBroker = data.creci !== "" || line.toLowerCase().includes('corretor') || currentSearchType === 'broker';

              return (
                <div key={idx} className="group bg-white p-8 rounded-[3rem] border border-slate-200 hover:border-blue-500 hover:shadow-2xl transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8 ring-1 ring-slate-100">
                  <div className="flex-1 min-w-0 flex items-start gap-6">
                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl flex-shrink-0 shadow-sm transition-all group-hover:scale-110 ${isBroker ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                      {isBroker ? '👤' : '🏢'}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <h5 className="text-xl font-black text-slate-900 group-hover:text-blue-600 truncate transition-colors flex items-center gap-3">
                        {data.name} 
                        {data.creci && <span className="text-[9px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100 font-black uppercase">CRECI: {data.creci}</span>}
                      </h5>
                      <p className="text-sm text-slate-500 font-bold leading-tight">{data.address}</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {data.phone && (
                          <span className="text-[10px] font-mono font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 uppercase tracking-widest">{data.phone}</span>
                        )}
                        {data.website && (
                          <a href={data.website.startsWith('http') ? data.website : `https://${data.website}`} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 uppercase tracking-widest">🌐 SITE</a>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <button onClick={() => openWhatsApp(data)} disabled={!data.phone} className="w-full sm:w-auto h-14 px-8 bg-emerald-500 text-white rounded-2xl text-[11px] font-black hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-30">💬 CONTATO</button>
                    <button onClick={() => onImport(data)} className="w-full sm:w-auto h-14 px-8 bg-slate-900 text-white rounded-2xl text-[11px] font-black hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl">📥 IMPORTAR</button>
                  </div>
                </div>
              );
            }) : (
              <div className="col-span-full py-24 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-200">
                <div className="text-7xl mb-6 grayscale opacity-20">🕵️‍♂️</div>
                <h4 className="text-2xl font-black text-slate-400">Dados não localizados</h4>
                <p className="text-sm text-slate-400 mt-2 font-bold uppercase tracking-widest">Tente outro domínio ou refina os termos de busca</p>
              </div>
            )}
          </div>

          {results.sources.length > 0 && (
            <div className="bg-slate-950 p-10 rounded-[3rem] shadow-2xl text-white">
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-blue-600 p-2.5 rounded-xl">🔗</div>
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Grounding de Fontes Digitais</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {results.sources.map((chunk, idx) => (chunk.maps || chunk.web) && (
                  <a key={idx} href={chunk.maps?.uri || chunk.web?.uri} target="_blank" rel="noopener noreferrer" className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-[11px] font-black text-slate-300 truncate flex items-center gap-3">
                    <span className="text-base">{chunk.maps ? '📍' : '🌐'}</span> {chunk.maps?.title || chunk.web?.title}
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
