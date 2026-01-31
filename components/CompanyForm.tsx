
import React, { useState, useRef, useEffect } from 'react';
import { Company, ContactHistoryEntry, Broker } from '../types';
import { fetchCompanyByCNPJ } from '../services/geminiService';

interface CompanyFormProps {
  onSave: (company: Omit<Company, 'id' | 'registrationDate'>) => void;
  onCancel: () => void;
  initialData?: Company;
  isPublic?: boolean;
}

export const CompanyForm: React.FC<CompanyFormProps> = ({ onSave, onCancel, initialData, isPublic = false }) => {
  const numberInputRef = useRef<HTMLInputElement>(null);

  // --- Máscaras ---
  const maskPhone = (v: string) => {
    let r = v.replace(/\D/g, "").substring(0, 11);
    if (r.length === 11) {
      return r.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    } else if (r.length > 2) {
      return r.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
    }
    return r;
  };

  const maskCEP = (v: string) => v.replace(/\D/g, "").substring(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
  
  const maskCNPJ = (v: string) => {
    let r = v.replace(/\D/g, "").substring(0, 14);
    if (r.length > 12) return r.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    if (r.length > 8) return r.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, "$1.$2.$3/$4");
    if (r.length > 5) return r.replace(/^(\d{2})(\d{3})(\d{0,3})/, "$1.$2.$3");
    if (r.length > 2) return r.replace(/^(\d{2})(\d{0,3})/, "$1.$2");
    return r;
  };

  const maskCPF = (v: string) => {
    return v.replace(/\D/g, "").substring(0, 11)
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const [docType, setDocType] = useState<'CNPJ' | 'CPF' | 'CRECI'>(
    (initialData?.docType as 'CNPJ' | 'CPF' | 'CRECI') || 'CNPJ'
  );
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    razaoSocial: initialData?.razaoSocial || '',
    cnpj: initialData?.cnpj || '',
    creci: initialData?.creci || '',
    creciUF: initialData?.creciUF || '',
    cep: initialData?.cep || '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    complement: '',
    email: initialData?.email || '',
    phone: initialData?.phone ? maskPhone(initialData.phone) : '',
    responsible: initialData?.responsible || '',
    partnershipManager: initialData?.partnershipManager || '',
    hiringManager: initialData?.hiringManager || (isPublic ? 'Cadastro Público' : ''),
    brokerCount: initialData?.brokerCount || 0,
    commissionRate: initialData?.commissionRate || 5,
    status: initialData?.status || 'Ativo',
    notes: initialData?.notes || '',
    contactHistory: initialData?.contactHistory || [] as ContactHistoryEntry[],
    brokers: initialData?.brokers || [] as Broker[],
    location: initialData?.location || { lat: -23.5505, lng: -46.6333 },
  });

  const [isSearchingCEP, setIsSearchingCEP] = useState(false);
  const [isSearchingCNPJ, setIsSearchingCNPJ] = useState(false);
  const [cnpjError, setCnpjError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData?.address) {
      const parts = initialData.address.split(' - ');
      const main = parts[0]?.split(', ') || [];
      setFormData(prev => ({
        ...prev,
        street: main[0] || '',
        number: main[1] || '',
        neighborhood: parts[1] || '',
        city: parts[2]?.split('/')[0] || '',
        state: parts[2]?.split('/')[1] || ''
      }));
    }
  }, [initialData]);

  const handleCNPJLookup = async (cnpj: string) => {
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length !== 14 || docType !== 'CNPJ') return;
    
    setIsSearchingCNPJ(true);
    setCnpjError(null);
    
    try {
      const data = await fetchCompanyByCNPJ(clean);
      
      if (data) {
        setFormData(prev => ({
          ...prev,
          name: data.nome_fantasia || data.razao_social || prev.name,
          razaoSocial: data.razao_social || prev.razaoSocial,
          cep: data.cep ? maskCEP(data.cep) : prev.cep,
          email: data.email || prev.email,
          phone: data.ddd_telefone_1 ? maskPhone(data.ddd_telefone_1) : prev.phone,
          street: data.logradouro || prev.street,
          number: data.numero || prev.number,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.municipio || prev.city,
          state: data.uf || prev.state,
          complement: data.complemento || prev.complement,
        }));
        
        if (data.numero) {
           setTimeout(() => numberInputRef.current?.focus(), 300);
        }
      } else {
        setCnpjError('CNPJ não encontrado.');
      }
    } catch (error) {
      setCnpjError('Erro ao consultar CNPJ.');
    } finally {
      setIsSearchingCNPJ(false);
    }
  };

  const handleCEPLookup = async (cep: string) => {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setIsSearchingCEP(true);
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await resp.json();
      if (!data.erro) {
        setFormData(prev => ({ 
          ...prev, 
          street: data.logradouro, 
          neighborhood: data.bairro, 
          city: data.localidade, 
          state: data.uf 
        }));
        setTimeout(() => numberInputRef.current?.focus(), 150);
      }
    } catch (e) { console.error(e); } finally { setIsSearchingCEP(false); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullAddress = `${formData.street}, ${formData.number}${formData.complement ? ` - ${formData.complement}` : ''} - ${formData.neighborhood} - ${formData.city}/${formData.state}`;
    const { street, number, neighborhood, city, state, complement, ...rest } = formData;
    
    onSave({ 
      ...rest, 
      address: fullAddress, 
      docType: docType
    });
  };

  return (
    <div className={`bg-white rounded-[2.5rem] p-12 shadow-2xl border border-slate-200 w-full mx-auto animate-fadeIn ${isPublic ? '' : 'max-w-5xl overflow-y-auto max-h-[90vh] custom-scrollbar'}`}>
      <div className="mb-12">
        <h3 className="text-3xl font-black text-slate-900 tracking-tight">{isPublic ? 'Credenciamento de Parceiro' : (initialData ? 'Atualização de CRM' : 'Nova Imobiliária Parceira')}</h3>
        <p className="text-sm text-slate-500 mt-2 font-medium">Os dados do CNPJ são preenchidos automaticamente para sua conveniência.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-12">
        {/* Identificação */}
        <section className="space-y-6">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
            <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">01</span>
            <span className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Documentação e Identificação</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Documento Principal</label>
              <div className="flex gap-2">
                <select 
                  className="w-32 h-14 px-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xs font-black text-slate-600 focus:bg-white focus:border-blue-500"
                  value={docType}
                  onChange={e => setDocType(e.target.value as 'CNPJ' | 'CPF' | 'CRECI')}
                >
                  <option value="CNPJ">CNPJ</option>
                  <option value="CPF">CPF</option>
                  <option value="CRECI">CRECI</option>
                </select>
                <div className="relative flex-1 flex gap-2">
                  <input 
                    required 
                    className={`h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-500 font-mono font-bold text-slate-800 ${docType === 'CRECI' ? 'w-2/3' : 'w-full'}`}
                    value={
                      docType === 'CNPJ' ? maskCNPJ(formData.cnpj) : 
                      docType === 'CPF' ? maskCPF(formData.cnpj) : 
                      formData.creci
                    } 
                    onChange={e => {
                      const val = e.target.value;
                      if (docType === 'CRECI') {
                        setFormData({ ...formData, creci: val });
                      } else {
                        setFormData({ ...formData, cnpj: val });
                        if (val.replace(/\D/g, '').length === 14 && docType === 'CNPJ') handleCNPJLookup(val);
                      }
                    }} 
                    placeholder={
                      docType === 'CNPJ' ? "00.000.000/0000-00" : 
                      docType === 'CPF' ? "000.000.000-00" : 
                      "Nº Registro"
                    } 
                  />
                  {docType === 'CRECI' && (
                    <input 
                      required
                      maxLength={2}
                      className="w-1/3 h-14 px-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-500 font-bold text-slate-800 uppercase text-center"
                      placeholder="UF"
                      value={formData.creciUF}
                      onChange={e => setFormData({ ...formData, creciUF: e.target.value.toUpperCase() })}
                    />
                  )}
                  {isSearchingCNPJ && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>
              </div>
              {cnpjError && <p className="text-[10px] text-red-500 font-bold ml-1">{cnpjError}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nome Fantasia / Exibição</label>
              <input required className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-500 font-bold text-slate-800" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Razão Social</label>
              <input className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-500 text-slate-600" value={formData.razaoSocial} onChange={e => setFormData({ ...formData, razaoSocial: e.target.value })} placeholder="Nome Jurídico da Empresa" />
            </div>
          </div>
        </section>

        {/* Localização Detalhada */}
        <section className="space-y-6">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
            <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">02</span>
            <span className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Sede e Logística</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
             <div className="md:col-span-2 relative space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">CEP</label>
                <input required className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-500 font-mono font-bold" value={formData.cep} onChange={e => { const v = maskCEP(e.target.value); setFormData({...formData, cep: v}); if(v.length === 9) handleCEPLookup(v); }} placeholder="00000-000" />
                {isSearchingCEP && <div className="absolute right-4 top-10 w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>}
             </div>
             <div className="md:col-span-3 space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Logradouro</label>
                <input required className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl outline-none" value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} placeholder="Rua, Avenida..." />
             </div>
             <div className="md:col-span-1 space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Número</label>
                <input ref={numberInputRef} required className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl outline-none" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} />
             </div>
             
             <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Bairro</label>
                <input required className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl outline-none" value={formData.neighborhood} onChange={e => setFormData({...formData, neighborhood: e.target.value})} />
             </div>
             <div className="md:col-span-3 space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Cidade</label>
                <input required className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl outline-none" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
             </div>
             <div className="md:col-span-1 space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Estado (UF)</label>
                <input required maxLength={2} className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-center font-bold uppercase" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value.toUpperCase()})} />
             </div>
             <div className="md:col-span-6 space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Complemento</label>
                <input className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl outline-none" value={formData.complement} onChange={e => setFormData({...formData, complement: e.target.value})} placeholder="Sala, Bloco, etc." />
             </div>
          </div>
        </section>

        {/* Gestão CRM */}
        <section className="space-y-6 bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
          <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
            <span className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center text-sm font-bold">03</span>
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">Parâmetros Comerciais</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest ml-1">Responsável Interno (Hub)</label>
                <input required className="w-full h-14 px-6 bg-white border border-blue-200 rounded-2xl outline-none font-black text-blue-600 shadow-sm" value={formData.hiringManager} onChange={e => setFormData({ ...formData, hiringManager: e.target.value })} />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Equipe (Corretores)</label>
                <input type="number" min="0" className="w-full h-14 px-6 bg-white border border-slate-200 rounded-2xl outline-none font-bold" value={formData.brokerCount} onChange={e => setFormData({ ...formData, brokerCount: parseInt(e.target.value) || 0 })} />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Comissão (%)</label>
                <input type="number" step="0.5" className="w-full h-14 px-6 bg-white border border-slate-200 rounded-2xl outline-none font-bold" value={formData.commissionRate} onChange={e => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) || 0 })} />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Telefone Principal</label>
                <input required className="w-full h-14 px-6 bg-white border border-slate-200 rounded-2xl outline-none font-bold" value={formData.phone} onChange={e => setFormData({ ...formData, phone: maskPhone(e.target.value) })} />
             </div>
          </div>
        </section>

        <div className="flex gap-4 pt-6 border-t border-slate-100">
          {!isPublic && (
            <button 
              type="button" 
              onClick={onCancel} 
              className="px-8 h-16 bg-white text-slate-500 border border-slate-200 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
          )}
          <button 
            type="submit" 
            className="flex-1 h-16 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
          >
            {initialData ? 'Sincronizar Atualizações ✓' : 'Consolidar Novo Parceiro ✓'}
          </button>
        </div>
      </form>
    </div>
  );
};
