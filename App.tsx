
import React, { useState, useEffect, useMemo } from 'react';
import { Layout, AppTab } from './components/Layout';
import { CompanyForm } from './components/CompanyForm';
import { InteractiveMap } from './components/InteractiveMap';
import { ReportsView } from './components/ReportsView';
import { CompanyDetailsModal } from './components/CompanyDetailsModal';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { ProspectingView } from './components/ProspectingView';
import { Company, DashboardStats } from './types';
import { getAIInsights } from './services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | undefined>();
  const [selectedCompanyForDetails, setSelectedCompanyForDetails] = useState<Company | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  
  // Filtros Avançados
  const [nameFilter, setNameFilter] = useState('');
  const [cnpjFilter, setCnpjFilter] = useState('');
  const [hiringManagerFilter, setHiringManagerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [isPublicMode, setIsPublicMode] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('mode') === 'register') setIsPublicMode(true);

    const saved = localStorage.getItem('partner_hub_v2_cos');
    if (saved) {
      setCompanies(JSON.parse(saved));
    } else {
      const mock: Company[] = [{
        id: '1', name: 'Horizonte Imobiliária', cnpj: '12.345.678/0001-99', docType: 'CNPJ',
        cep: '01310-100', address: 'Av. Paulista, 1000 - Bela Vista - SP',
        location: { lat: -23.5614, lng: -46.6559 }, responsible: 'Maria Silva',
        partnershipManager: 'Ana Paula Santos',
        hiringManager: 'Ricardo Mendes', email: 'contato@horizonte.com', phone: '(11) 98888-7777',
        registrationDate: '2023-10-15', brokerCount: 5, commissionRate: 5, status: 'Ativo',
        lastContactType: 'Reunião',
        contactHistory: [{ id: 'h1', date: '2024-03-20', type: 'Reunião', summary: 'Definição de novas metas de captação.', details: 'Reunião estratégica inicial para o Q2.' }],
        brokers: [{ id: 'b1', name: 'Juliana Castro', creci: '998877', creciUF: 'SP', email: 'juliana@horizonte.com' }]
      }];
      setCompanies(mock);
      localStorage.setItem('partner_hub_v2_cos', JSON.stringify(mock));
    }
  }, []);

  useEffect(() => {
    if (companies.length > 0) localStorage.setItem('partner_hub_v2_cos', JSON.stringify(companies));
  }, [companies]);

  const stats: DashboardStats = useMemo(() => {
    const totalBrokers = companies.reduce((acc, c) => acc + (c.brokerCount || 0), 0);
    return {
      totalCompanies: companies.length,
      totalBrokers,
      avgBrokers: companies.length > 0 ? Math.round(totalBrokers / companies.length) : 0,
      activePercentage: companies.length > 0 ? Math.round((companies.filter(c => c.status === 'Ativo').length / companies.length) * 100) : 0
    };
  }, [companies]);

  const upcomingContacts = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    return companies.filter(c => {
      if (!c.nextContactDate) return false;
      const d = new Date(c.nextContactDate);
      return d >= today && d <= nextWeek;
    }).sort((a,b) => new Date(a.nextContactDate!).getTime() - new Date(b.nextContactDate!).getTime());
  }, [companies]);

  const uniqueHiringManagers = useMemo(() => {
    return Array.from(new Set(companies.map(c => c.hiringManager))).filter(Boolean).sort();
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const matchesName = c.name.toLowerCase().includes(nameFilter.toLowerCase());
      const matchesCnpj = c.cnpj.replace(/\D/g, '').includes(cnpjFilter.replace(/\D/g, ''));
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesHiring = hiringManagerFilter === 'all' || c.hiringManager === hiringManagerFilter;
      return matchesName && matchesCnpj && matchesStatus && matchesHiring;
    });
  }, [companies, nameFilter, cnpjFilter, statusFilter, hiringManagerFilter]);

  const handleUpdateBrokerCount = (id: string, delta: number) => {
    setCompanies(prev => prev.map(c => {
      if (c.id === id) {
        const newCount = Math.max(0, (c.brokerCount || 0) + delta);
        return { ...c, brokerCount: newCount };
      }
      return c;
    }));
  };

  const handleSaveCompany = (data: Omit<Company, 'id' | 'registrationDate'>) => {
    if (editingCompany && editingCompany.id) {
      setCompanies(companies.map(c => c.id === editingCompany.id ? { ...c, ...data } : c));
    } else {
      setCompanies([{ ...data, id: Math.random().toString(36).substr(2, 9), registrationDate: new Date().toISOString().split('T')[0] }, ...companies]);
    }
    if (isPublicMode) setRegistrationSuccess(true);
    else { setShowForm(false); setEditingCompany(undefined); }
  };

  const handleUpdateCompany = (updated: Company) => {
    setCompanies(companies.map(c => c.id === updated.id ? updated : c));
    if (selectedCompanyForDetails?.id === updated.id) setSelectedCompanyForDetails(updated);
  };

  const handleEdit = (c: Company) => { setEditingCompany(c); setShowForm(true); setActiveTab('companies'); };

  const handleImport = (companyData: any) => {
    const imported: Partial<Company> = {
      ...companyData,
      status: 'Inativo',
      brokerCount: 0,
      commissionRate: 5,
      hiringManager: 'Fila de Triagem IA',
      contactHistory: [],
      brokers: []
    };
    setEditingCompany(imported as Company);
    setShowForm(true);
    setActiveTab('companies');
  };

  const handleRestore = (newCompanies: Company[]) => {
    setCompanies(newCompanies);
    localStorage.setItem('partner_hub_v2_cos', JSON.stringify(newCompanies));
  };

  const fetchAIInsights = async () => {
    setLoadingInsights(true);
    const res = await getAIInsights(companies);
    setAiInsights(res);
    setLoadingInsights(false);
  };

  if (isPublicMode) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        {registrationSuccess ? (
          <div className="bg-white p-16 rounded-[3rem] shadow-2xl text-center max-w-md border border-emerald-100">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center text-5xl mx-auto mb-8 shadow-inner">✓</div>
            <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Cadastro Recebido!</h2>
            <p className="text-slate-500 mb-10 font-medium">Suas informações foram integradas ao nosso CRM. Nossa equipe comercial entrará em contato em breve.</p>
            <button onClick={() => window.location.reload()} className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all">Novo Credenciamento</button>
          </div>
        ) : (
          <div className="w-full max-w-2xl">
            <header className="text-center mb-10">
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter">PartnerHub <span className="text-blue-600">Onboarding</span></h1>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Portal Externo de Novas Parcerias</p>
            </header>
            <CompanyForm onSave={handleSaveCompany} onCancel={() => {}} isPublic={true} />
          </div>
        )}
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} companies={companies} upcomingContacts={upcomingContacts}>
      {activeTab === 'dashboard' && (
        <div className="space-y-10 animate-fadeIn">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">Executive Dashboard</h3>
              <p className="text-slate-500 text-sm font-medium">Indicadores chave de desempenho e saúde da rede.</p>
            </div>
            <div className="flex gap-4">
               <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Sincronização OK</span>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-900/5 group hover:bg-blue-600 transition-all duration-500">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-200">Total de Parceiros</p>
              <h4 className="text-5xl font-black text-slate-900 mt-3 tracking-tighter group-hover:text-white">{stats.totalCompanies}</h4>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400 group-hover:text-blue-100">
                <span>📈 +12% este mês</span>
              </div>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-900/5 group hover:bg-indigo-600 transition-all duration-500">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-200">Capilaridade (Corretores)</p>
              <h4 className="text-5xl font-black text-slate-900 mt-3 tracking-tighter group-hover:text-white">{stats.totalBrokers}</h4>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400 group-hover:text-indigo-100">
                <span>🏢 {stats.avgBrokers} por unidade</span>
              </div>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-900/5 group hover:bg-emerald-600 transition-all duration-500">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-emerald-200">Health Score (Atividade)</p>
              <h4 className="text-5xl font-black text-emerald-600 mt-3 tracking-tighter group-hover:text-white">{stats.activePercentage}%</h4>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400 group-hover:text-emerald-100">
                <span>🔥 Operação aquecida</span>
              </div>
            </div>
            <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden">
               <div className="relative z-10">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contatos Agendados</p>
                <h4 className="text-5xl font-black text-white mt-3 tracking-tighter">{upcomingContacts.length}</h4>
                <div className="mt-4">
                  <button onClick={() => setActiveTab('companies')} className="text-[9px] font-black text-blue-400 uppercase tracking-widest hover:text-blue-300">Ver Agenda →</button>
                </div>
               </div>
               <div className="absolute -right-10 -bottom-10 text-[10rem] opacity-5 select-none">🔔</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl shadow-slate-900/5">
               <div className="flex justify-between items-center mb-10">
                 <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Matriz de Capilaridade Comercial</h4>
                 <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top 8 Parceiros por Equipe</div>
               </div>
               <div className="h-80">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={companies.slice(0, 8)}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                     <Tooltip 
                        cursor={{fill: '#f8fafc'}} 
                        contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '15px'}} 
                        labelStyle={{fontWeight: 'black', marginBottom: '5px', color: '#1e293b'}}
                     />
                     <Bar dataKey="brokerCount" radius={[12, 12, 0, 0]} fill="#3b82f6" barSize={40}>
                        {companies.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#6366f1'} />
                        ))}
                     </Bar>
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>
            <div className="bg-slate-950 rounded-[3rem] p-10 shadow-2xl text-white flex flex-col">
               <div className="flex justify-between items-center mb-8">
                 <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-lg">💡</div>
                   <h4 className="font-black text-sm uppercase tracking-widest">Insight Engine</h4>
                 </div>
                 <button onClick={fetchAIInsights} disabled={loadingInsights} className="text-[10px] font-black bg-white/10 px-4 py-2 rounded-xl hover:bg-white/20 transition-all uppercase tracking-widest">
                   {loadingInsights ? 'Processando...' : 'Atualizar'}
                 </button>
               </div>
               <div className="flex-1 text-xs leading-relaxed text-slate-400 font-medium italic overflow-y-auto custom-scrollbar pr-4">
                 {aiInsights || "Acione a inteligência artificial para uma análise cruzada entre volumetria de corretores, taxas de comissão e desempenho por gestor de conta (Hub)."}
               </div>
               <div className="mt-8 pt-6 border-t border-white/10 text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] text-center">Powered by Gemini IA</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'companies' && (
        <div className="space-y-10 animate-fadeIn">
          {!showForm ? (
            <>
              <div className="flex flex-col space-y-6 no-print">
                <div className="flex justify-between items-end">
                   <div>
                     <h3 className="text-3xl font-black text-slate-900 tracking-tight">Base de Parceiros</h3>
                     <p className="text-sm text-slate-500 font-medium">Gestão centralizada de credenciamentos e acordos comerciais.</p>
                   </div>
                   <div className="flex gap-4">
                     <button onClick={() => setShowForm(true)} className="px-10 h-14 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95">Novo Credenciamento</button>
                   </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-900/5 space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Pesquisar Empresa</label>
                      <input 
                        type="text" 
                        placeholder="Nome imobiliária..." 
                        className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:border-blue-500 outline-none transition-all"
                        value={nameFilter}
                        onChange={e => setNameFilter(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Responsável Interno (Hub)</label>
                      <select 
                        className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none"
                        value={hiringManagerFilter}
                        onChange={e => setHiringManagerFilter(e.target.value)}
                      >
                        <option value="all">Todos os Gestores</option>
                        {uniqueHiringManagers.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Status Operacional</label>
                      <select 
                        className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                      >
                        <option value="all">Ver Todos</option>
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button onClick={() => { setNameFilter(''); setCnpjFilter(''); setHiringManagerFilter('all'); setStatusFilter('all'); }} className="w-full h-12 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Limpar Filtros</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-900/5 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 border-b border-slate-800">
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      <th className="px-8 py-5">Imobiliária / Documento</th>
                      <th className="px-8 py-5">Gestão (Hub / Externo)</th>
                      <th className="px-8 py-5 text-center">Status Operacional</th>
                      <th className="px-8 py-5 text-center">Equipe (Ajuste Rápido)</th>
                      <th className="px-8 py-5 text-right">Controles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCompanies.length > 0 ? filteredCompanies.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-all">
                        <td className="px-8 py-6">
                          <p className="font-black text-slate-800 text-sm tracking-tight">{c.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-1">{c.docType}: {c.cnpj}</p>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Hub: {c.hiringManager}</p>
                          <p className="text-xs font-bold text-slate-700">{c.partnershipManager || 'N/A'}</p>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${c.status === 'Ativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                            {c.status === 'Ativo' ? '🟢 ATIVO' : '🔴 PAUSADO'}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center justify-center gap-4">
                            <button 
                              onClick={() => handleUpdateBrokerCount(c.id, -1)}
                              className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all active:scale-90 shadow-sm border border-slate-200"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-black text-slate-900 text-sm">{c.brokerCount}</span>
                            <button 
                              onClick={() => handleUpdateBrokerCount(c.id, 1)}
                              className="w-8 h-8 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all active:scale-90 shadow-sm border border-blue-100"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setSelectedCompanyForDetails(c)} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">👁️</button>
                            <button onClick={() => handleEdit(c)} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">✏️</button>
                            <button onClick={() => setCompanyToDelete(c)} className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center">
                          <div className="text-5xl mb-4 grayscale opacity-30">🕵️‍♂️</div>
                          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Nenhum parceiro encontrado nesta busca</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <CompanyForm onSave={handleSaveCompany} onCancel={() => { setShowForm(false); setEditingCompany(undefined); }} initialData={editingCompany} />
          )}
        </div>
      )}

      {activeTab === 'prospecting' && <ProspectingView onImport={handleImport} />}
      {activeTab === 'map' && <InteractiveMap companies={companies} />}
      {activeTab === 'reports' && (
        <ReportsView 
          companies={companies} 
          onEdit={handleEdit} 
          onDelete={(id) => setCompanyToDelete(companies.find(c => c.id === id) || null)} 
          onView={setSelectedCompanyForDetails}
          onRestore={handleRestore}
        />
      )}
      
      {selectedCompanyForDetails && <CompanyDetailsModal company={selectedCompanyForDetails} onClose={() => setSelectedCompanyForDetails(null)} onUpdate={handleUpdateCompany} />}
      {companyToDelete && <DeleteConfirmationModal company={companyToDelete} onConfirm={() => { setCompanies(companies.filter(x => x.id !== companyToDelete.id)); setCompanyToDelete(null); }} onCancel={() => setCompanyToDelete(null)} />}
    </Layout>
  );
};

export default App;
