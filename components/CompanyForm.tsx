
import React, { useState, useRef, useEffect } from 'react';
import { Company, ContactHistoryEntry, Broker } from '../types';
import { fetchCompanyByCNPJ } from '../services/geminiService';

interface CompanyFormProps {
  onSave: (company: Omit<Company, 'id' | 'registrationDate'>) => void;
  onCancel: () => void;
  initialData?: Company;
  isPublic?: boolean;
}

const BR_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export const CompanyForm: React.FC<CompanyFormProps> = ({ onSave, onCancel, initialData, isPublic = false }) => {
  const numberInputRef = useRef<HTMLInputElement>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // --- URLs de Compartilhamento ---
  const publicRegistrationUrl = `${window.location.origin}${window.location.pathname}?mode=register`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicRegistrationUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // --- Máscaras ---
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

  const maskCEP = (v: string) => v.replace(/\D/g, "").substring(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
  const maskCNPJ = (v: string) => {
    let r = v.replace(/\D/g, "").substring(0, 14);
    if (r.length > 12) return r.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    if (r.length > 8) return r.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, "$1.$2.$3/$4");
    if (r.length > 5) return r.replace(/^(\d{2})(\d{3})(\d{0,3})/, "$1.$2.$3");
    if (r.length > 2) return r.replace(/^(\d{2})(\d{0,3})/, "$1.$2");
    return r;
  };

  // --- Estados ---
  const [docType, setDocType] = useState<'CNPJ' | 'CPF'>(
    initialData?.docType === 'CRECI' ? 'CNPJ' : (initialData?.docType as 'CNPJ' | 'CPF' || 'CNPJ')
  );
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
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

  const [newBroker, setNewBroker] = useState<Omit<Broker, 'id'>>({
    name: '',
    creci: '',
    creciUF: '',
    email: ''
  });

  const [isSearchingCEP, setIsSearchingCEP] = useState(false);
  const [isSearchingCNPJ, setIsSearchingCNPJ] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
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

  // Handler para busca de CNPJ
  const handleCNPJLookup = async (cnpj: string) => {
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length !== 14 || docType !== 'CNPJ') return;
    
    setIsSearchingCNPJ(true);
    setCnpjError(null);
    
    try {
      const data = await fetchCompanyByCNPJ(clean);
      
      if (data) {
        // Combinar Nome Fantasia e Razão Social para o campo de Nome
        let finalName = data.razao_social;
        if (data.nome_fantasia && data.nome_fantasia !== data.razao_social) {
          finalName = `${data.nome_fantasia} (${data.razao_social})`;
        }

        setFormData(prev => ({
          ...prev,
          name: finalName || prev.name,
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
        
        // Se retornou CEP e não retornou endereço completo, dispara busca de CEP como fallback
        if (data.cep && !data.logradouro) {
          handleCEPLookup(data.cep);
        } else if (data.numero) {
          // Focar no campo de responsável após preenchimento automático bem sucedido
          setTimeout(() => {
            const respInput = document.querySelector('input[placeholder="Nome para contato"]') as HTMLInputElement;
            respInput?.focus();
          }, 300);
        }
      } else {
        setCnpjError('CNPJ não encontrado ou erro na consulta.');
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
    setCepError(null);
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await resp.json();
      if (!data.erro) {
        setFormData(prev => ({ ...prev, street: data.logradouro, neighborhood: data.bairro, city: data.localidade, state: data.uf }));
        setTimeout(() => numberInputRef.current?.focus(), 150);
      } else { setCepError('CEP não encontrado.'); }
    } catch (e) { setCepError('Erro ao buscar o CEP.'); } finally { setIsSearchingCEP(false); }
  };

  const handleAddBroker = () => {
    if (!newBroker.name.trim() || !newBroker.creci.trim() || !newBroker.creciUF) {
      alert("Para vincular um corretor, preencha Nome, CRECI e a respectiva UF.");
      return;
    }
    const broker: Broker = {
      ...newBroker,
      id: Math.random().toString(36).substr(2, 9)
    };
    setFormData(prev => {
      const updatedBrokers = [...prev.brokers, broker];
      return {
        ...prev,
        brokers: updatedBrokers,
        brokerCount: updatedBrokers.length
      };
    });
    setNewBroker({ name: '', creci: '', creciUF: '', email: '' });
  };

  const handleRemoveBroker = (id: string) => {
    setFormData(prev => {
      const updated = prev.brokers.filter(b => b.id !== id);
      return { ...prev, brokers: updated, brokerCount: updated.length };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullAddress = `${formData.street}, ${formData.number}${formData.complement ? ` - ${formData.complement}` : ''} - ${formData.neighborhood} - ${formData.city}/${formData.state}`;
    const { street, number, neighborhood, city, state, complement, ...rest } = formData;
    const latest = formData.contactHistory[0];
    
    onSave({ 
      ...rest, 
      address: fullAddress, 
      docType: docType,
      cnpj: formData.cnpj,
      creci: formData.creci,
      creciUF: formData.creciUF,
      lastContactDate: latest?.date,
      lastContactType: latest?.type,
      contactSummary: latest?.summary,
      nextContactDate: latest?.nextContactDate
    });
  };

  return (
    <div className={`bg-white rounded-3xl p-8 shadow-2xl border border-slate-200 w-full mx-auto animate-fadeIn ${isPublic ? '' : 'max-w-4xl overflow-y-auto max-h-[90vh]'}`}>
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">{isPublic ? 'Credenciamento Externo' : (initialData ? 'Atualizar Parceiro' : 'Cadastro de Imobiliária')}</h3>
          <p className="text-sm text-slate-500 mt-1">Insira os dados da empresa e vincule os profissionais autônomos associados.</p>
        </div>
      </div>

      {!isPublic && (
        <div className="mb-10 p-5 bg-indigo-50 border border-indigo-100 rounded-[2rem] flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-indigo-200">📋</div>
            <div>
              <p className="text-xs font-black text-indigo-900 uppercase tracking-widest">Link de Captação</p>
              <p className="text-[11px] text-indigo-600 font-medium">O parceiro pode preencher esses dados remotamente.</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={handleCopyLink}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${copiedLink ? 'bg-emerald-600 text-white shadow-emerald-100' : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-600 hover:text-white shadow-sm'}`}
          >
            {copiedLink ? 'Copiado ✓' : 'Copiar URL Pública'}
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-12">
        {/* Identificação da Empresa */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="text-[11px] font-black uppercase tracking-widest text-indigo-600">Dados da Empresa</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">CNPJ ou CPF</label>
              <div className="flex gap-2 relative">
                <select 
                  className="w-28 px-4 py-4 bg-slate-100 border border-slate-200 rounded-2xl outline-none text-[10px] font-black text-slate-600"
                  value={docType}
                  onChange={e => setDocType(e.target.value as 'CNPJ' | 'CPF')}
                >
                  <option value="CNPJ">CNPJ</option>
                  <option value="CPF">CPF</option>
                </select>
                <div className="relative flex-1">
                  <input 
                    required 
                    className={`w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 transition-all font-mono ${cnpjError ? 'border-red-300' : ''}`} 
                    value={docType === 'CNPJ' ? maskCNPJ(formData.cnpj) : formData.cnpj} 
                    onChange={e => {
                      const val = e.target.value;
                      setFormData({ ...formData, cnpj: val });
                      const clean = val.replace(/\D/g, '');
                      if (clean.length === 14 && docType === 'CNPJ') {
                        handleCNPJLookup(clean);
                      }
                    }} 
                    placeholder={docType === 'CNPJ' ? "00.000.000/0000-00" : "000.000.000-00"} 
                  />
                  {isSearchingCNPJ && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>
              </div>
              {cnpjError && <p className="text-[10px] text-red-500 font-bold ml-1">{cnpjError}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Razão Social / Nome Fantasia</label>
              <input required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-800" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Registro CRECI Jurídico (Opcional)</label>
              <div className="flex gap-2">
                <input 
                  className="flex-1 px-5 py-4 bg-indigo-50 border border-indigo-100 rounded-2xl outline-none text-indigo-900 font-bold focus:border-indigo-500 transition-all placeholder:text-indigo-300" 
                  value={formData.creci} 
                  onChange={e => setFormData({ ...formData, creci: e.target.value })} 
                  placeholder="Número CRECI" 
                />
                <select 
                  className="w-28 px-4 py-4 bg-indigo-50 border border-indigo-100 rounded-2xl outline-none text-[10px] font-black text-indigo-800"
                  value={formData.creciUF}
                  onChange={e => setFormData({ ...formData, creciUF: e.target.value })}
                >
                  <option value="">UF</option>
                  {BR_STATES.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Cadastro Detalhado de Corretores Individuais */}
        <section className="space-y-6 bg-amber-50/20 p-8 rounded-[2.5rem] border border-amber-100 ring-1 ring-amber-50/50">
          <div className="flex items-center justify-between border-b border-amber-100 pb-4">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center text-xl shadow-lg shadow-amber-200/50">👤</div>
               <div>
                  <h4 className="text-[11px] font-black uppercase text-amber-700 tracking-widest">Equipe de Corretores</h4>
                  <p className="text-[10px] text-amber-600 font-medium">Cadastre os profissionais vinculados a esta imobiliária.</p>
               </div>
            </div>
            <span className="text-[10px] font-black text-amber-800 bg-amber-200/50 px-3 py-1 rounded-full">{formData.brokers.length} Cadastrados</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-amber-700/70 ml-1">Nome Completo do Corretor</label>
              <input 
                className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl outline-none text-sm font-bold text-amber-900 placeholder:text-amber-200 focus:border-amber-500 transition-all shadow-sm" 
                placeholder="Ex: Roberto Gomes" 
                value={newBroker.name}
                onChange={e => setNewBroker({...newBroker, name: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-amber-700/70 ml-1">E-mail de Contato</label>
              <input 
                type="email"
                className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl outline-none text-sm font-bold text-amber-900 placeholder:text-amber-200 focus:border-amber-500 transition-all shadow-sm" 
                placeholder="roberto@email.com.br" 
                value={newBroker.email}
                onChange={e => setNewBroker({...newBroker, email: e.target.value})}
              />
            </div>
            <div className="md:col-span-2 grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <label className="text-[9px] font-black uppercase text-amber-700/70 ml-1">Número CRECI (PF)</label>
                <input 
                  className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl outline-none text-sm font-bold text-amber-900 placeholder:text-amber-200 focus:border-amber-500 transition-all shadow-sm" 
                  placeholder="Registro Profissional" 
                  value={newBroker.creci}
                  onChange={e => setNewBroker({...newBroker, creci: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-amber-700/70 ml-1">UF</label>
                <select 
                  className="w-full px-3 py-3 bg-white border border-amber-200 rounded-xl outline-none text-xs font-black text-amber-800 shadow-sm"
                  value={newBroker.creciUF}
                  onChange={e => setNewBroker({...newBroker, creciUF: e.target.value})}
                >
                  <option value="">UF</option>
                  {BR_STATES.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
            </div>
          </div>
          
          <button 
            type="button" 
            onClick={handleAddBroker}
            className="w-full py-3.5 bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-amber-200 hover:bg-amber-700 transition-all active:scale-95"
          >
            Adicionar à Lista de Profissionais ✓
          </button>

          {formData.brokers.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6 border-t border-amber-100">
              {formData.brokers.map(broker => (
                <div key={broker.id} className="flex items-center justify-between p-4 bg-white border border-amber-100 rounded-2xl group hover:shadow-lg hover:shadow-amber-900/5 transition-all">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-800 truncate">{broker.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded uppercase">PF: {broker.creci} / {broker.creciUF}</span>
                      <span className="text-[9px] text-slate-400 truncate font-medium">{broker.email}</span>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => handleRemoveBroker(broker.id)}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="Remover"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Localização da Sede */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Endereço de Correspondência</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <div className="relative">
                <input required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 transition-all font-mono" value={formData.cep} onChange={e => { const v = maskCEP(e.target.value); setFormData({...formData, cep: v}); if(v.length === 9) handleCEPLookup(v); }} placeholder="CEP" />
                {isSearchingCEP && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>}
             </div>
             <input required className="md:col-span-2 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} placeholder="Rua / Avenida" />
             <input ref={numberInputRef} required className="px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} placeholder="Num." />
             <input className="px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" value={formData.neighborhood} onChange={e => setFormData({...formData, neighborhood: e.target.value})} placeholder="Bairro" />
             <input className="md:col-span-2 px-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl outline-none font-bold text-slate-600" value={formData.city} readOnly placeholder="Cidade" />
             <input className="px-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl outline-none font-bold text-slate-600" value={formData.state} readOnly placeholder="Estado" />
          </div>
        </section>

        {/* Gestão e Contatos */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Pessoas de Contato</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Responsável na Imobiliária</label>
                <input required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" value={formData.responsible} onChange={e => setFormData({ ...formData, responsible: e.target.value })} placeholder="Nome para contato" />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">WhatsApp Principal</label>
                <input required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-mono" value={formData.phone} onChange={e => setFormData({ ...formData, phone: maskPhone(e.target.value) })} placeholder="(00) 00000-0000" />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">E-mail para Notificações</label>
                <input type="email" required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="exemplo@imobiliaria.com.br" />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Gestor Externo (No Parceiro)</label>
                <input className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" value={formData.partnershipManager} onChange={e => setFormData({ ...formData, partnershipManager: e.target.value })} placeholder="Nome do contato estratégico" />
             </div>
             {!isPublic && (
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Responsável Interno (Hub)</label>
                  <input required className="w-full px-5 py-4 bg-indigo-50 border border-indigo-100 rounded-2xl outline-none font-black text-indigo-900" value={formData.hiringManager} onChange={e => setFormData({ ...formData, hiringManager: e.target.value })} placeholder="Nome do gestor interno" />
               </div>
             )}
          </div>
        </section>

        <div className="flex gap-4 pt-10 border-t border-slate-100">
          {!isPublic && (
            <button 
              type="button" 
              onClick={onCancel} 
              className="flex-1 py-5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
            >
              Cancelar
            </button>
          )}
          <button 
            type="submit" 
            className="flex-[2] py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
          >
            {isPublic ? 'Enviar Credenciamento ✓' : (initialData ? 'Atualizar Dados' : 'Concluir Cadastro')}
          </button>
        </div>
      </form>
    </div>
  );
};
