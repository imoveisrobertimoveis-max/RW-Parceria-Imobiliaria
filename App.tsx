
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

const BR_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const ShareLinkModal: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">🔗</div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Link de Cadastro Público</h3>
          <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32 mx-auto my-6 p-2 border rounded-2xl" />
          <div className="flex gap-2 items-center bg-slate-50 p-3 rounded-2xl border border-slate-200 mb-6">
            <span className="text-[10px] font-mono truncate flex-1">{url}</span>
            <button onClick={handleCopy} className="p-2 bg-white border rounded-lg hover:bg-blue-50">{copied ? '✅' : '📋'}</button>
          </div>
          <button onClick={onClose} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold">Fechar</button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | undefined>();
  const [selectedCompanyForDetails, setSelectedCompanyForDetails] = useState<Company | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  
  // Filtros
  const [nameFilter, setNameFilter] = useState('');
  const [cnpjFilter, setCnpjFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [partnershipManagerFilter, setPartnershipManagerFilter] = useState<string>('all');
  const [minBrokers, setMinBrokers] = useState<string>('');
  const [maxBrokers, setMaxBrokers] = useState<string>('');
  const [creciFilter, setCreciFilter] = useState('');
  const [creciUfFilter, setCreciUfFilter] = useState('all');
  const [contactTypeFilter, setContactTypeFilter] = useState<string>('all');

  const [isPublicMode, setIsPublicMode] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const publicRegistrationUrl = useMemo(() => `${window.location.origin}${window.location.pathname}?mode=register`, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('mode') === 'register') setIsPublicMode(true);

    const saved = localStorage.getItem('partner_hub_v2_cos');
    if (saved) {
      setCompanies(JSON.parse(saved));
    } else {
      const mock: Company[] = [{
        id: '1', name: 'Horizonte Imóveis', cnpj: '12.345.678/0001-99', docType: 'CNPJ',
        cep: '01310-100', address: 'Av. Paulista, 1000 - Bela Vista - SP',
        location: { lat: -23.5614, lng: -46.6559 }, responsible: 'Maria Silva',
        partnershipManager: 'Ana Paula Santos',
        hiringManager: 'Ricardo Mendes', email: 'contato@horizonte.com', phone: '(11) 98888-7777',
        registrationDate: '2023-10-15', brokerCount: 1, commissionRate: 5, status: 'Ativo',
        lastContactType: 'Reunião',
        contactHistory: [{ id: 'h1', date: '2024-03-20', type: 'Reunião', summary: 'Definição de novas metas.', details: 'Reunião estratégica inicial.' }],
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

  const uniquePartnershipManagers = useMemo(() => {
    const managers = companies
      .map(c => c.partnershipManager)
      .filter((m): m is string => !!m && m.trim() !== '');
    return Array.from(new Set(managers)).sort();
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const matchesName = c.name.toLowerCase().includes(nameFilter.toLowerCase());
      const matchesCnpj = c.cnpj.replace(/\D/g, '').includes(cnpjFilter.replace(/\D/g, ''));
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesManager = partnershipManagerFilter === 'all' || c.partnershipManager === partnershipManagerFilter;
      const matchesMin = minBrokers === '' || c.brokerCount >= parseInt(minBrokers);
      const matchesMax = maxBrokers === '' || c.brokerCount <= parseInt(maxBrokers);
      
      const companyCreci = c.creci || (c.docType === 'CRECI' ? c.cnpj : '');
      const matchesCreci = companyCreci.toLowerCase().includes(creciFilter.toLowerCase());
      const matchesCreciUf = creciUfFilter === 'all' || c.creciUF === creciUfFilter;
      
      const matchesContactType = contactTypeFilter === 'all' || c.lastContactType === contactTypeFilter;

      return matchesName && matchesCnpj && matchesStatus && matchesManager && matchesMin && matchesMax && matchesCreci && matchesCreciUf && matchesContactType;
    });
  }, [companies, nameFilter, cnpjFilter, statusFilter, partnershipManagerFilter, minBrokers, maxBrokers, creciFilter, creciUfFilter, contactTypeFilter]);

  const handleSaveCompany = (data: Omit<Company, 'id' | 'registrationDate'>) => {
    if (editingCompany) {
      setCompanies(companies.map(c => c.id === editingCompany.id ? { ...c, ...data } : c));
    } else {
      setCompanies([{ ...data, id: Math.random().toString(36).substr(2, 9), registrationDate: new Date().toISOString().split('T')[0] }, ...companies]);
    }
    if (isPublicMode) setRegistrationSuccess(true);
    else { setShowForm(false); setEditingCompany(undefined); }
  };

  const handleEdit = (c: Company) => { setEditingCompany(c); setShowForm(true); setActiveTab('companies'); };

  const handleImport = (companyData: { name: string; address: string; phone: string; creci?: string; docType?: 'CNPJ' | 'CPF' | 'CRECI' }) => {
    const importedCompany: Partial<Company> = {
      name: companyData.name,
      address: companyData.address,
      phone: companyData.phone,
      cnpj: companyData.docType === 'CRECI' ? (companyData.creci || '') : '',
      creci: companyData.creci || '',
      docType: companyData.docType || 'CNPJ',
      status: 'Inativo',
      brokerCount: 0,
      commissionRate: 5,
      hiringManager: 'IA Radar Import',
      contactHistory: [],
      brokers: []
    };
    setEditingCompany(importedCompany as Company);
    setShowForm(true);
    setActiveTab('companies');
  };

  const fetchAIInsights = async () => {
    setLoadingInsights(true);
    const res = await getAIInsights(companies);
    setAiInsights(res);
    setLoadingInsights(false);
  };

  const handleClearFilters = () => {
    setNameFilter('');
    setCnpjFilter('');
    setStatusFilter('all');
    setPartnershipManagerFilter('all');
    setMinBrokers('');
    setMaxBrokers('');
    setCreciFilter('');
    setCreciUfFilter('all');
    setContactTypeFilter('all');
  };

  const handleExportCSV = () => {
    if (filteredCompanies.length === 0) {
      alert("Não há dados filtrados para exportar.");
      return;
    }

    const headers = ["Nome da Empresa", "CNPJ/CPF", "Telefone", "Status", "Gestor da Parceria", "CRECI", "UF CRECI", "Último Contato", "Data Registro", "Equipe"];
    const csvContent = filteredCompanies.map(c => {
      const creciValue = c.creci || (c.docType === 'CRECI' ? c.cnpj : '');
      return [
        `"${c.name.replace(/"/g, '""')}"`,
        `"${c.cnpj}"`,
        `"${c.phone}"`,
        `"${c.status}"`,
        `"${(c.partnershipManager || '').replace(/"/g, '""')}"`,
        `"${(creciValue || '').replace(/"/g, '""')}"`,
        `"${c.creciUF || ''}"`,
        `"${c.lastContactType || 'N/A'}"`,
        `"${c.registrationDate}"`,
        c.brokerCount
      ].join(",");
    });

    const csvString = "\ufeff" + [headers.join(","), ...csvContent].join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `parceiros_filtrados_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isPublicMode) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        {registrationSuccess ? (
          <div className="bg-white p-12 rounded-3xl shadow-2xl text-center max-w-md border">
            <div className="text-5xl mb-6">✅</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Sucesso!</h2>
            <p className="text-slate-500 mb-8">Seus dados foram enviados. Nossa equipe analisará e entrará em contato em breve.</p>
            <button onClick={() => window.location.reload()} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold">Novo Cadastro</button>
          </div>
        ) : (
          <div className="w-full max-w-2xl">
            <header className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-800">PartnerHub</h1>
              <p className="text-slate-500 font-medium mt-1">Portal de Credenciamento Externo</p>
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
        <div className="space-y-8 animate-fadeIn">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold text-slate-800">Visão Geral da Rede</h3>
              <p className="text-sm text-slate-500">Métricas consolidadas de desempenho e relacionamento.</p>
            </div>
            <button onClick={() => setShowShareModal(true)} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100 transition-all hover:scale-[1.02] active:scale-95">🔗 Link de Captação</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Parceiros</p>
              <h4 className="text-3xl font-black text-slate-800 mt-2">{stats.totalCompanies}</h4>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Equipe Total</p>
              <h4 className="text-3xl font-black text-slate-800 mt-2">{stats.totalBrokers} <span className="text-xs text-slate-400 font-medium">corretores</span></h4>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Atividade</p>
              <h4 className="text-3xl font-black text-green-600 mt-2">{stats.activePercentage}%</h4>
            </div>
            <div className="bg-blue-600 p-6 rounded-2xl shadow-xl text-white">
              <p className="text-xs font-bold text-blue-200 uppercase tracking-widest">Ticket Médio</p>
              <h4 className="text-2xl font-bold mt-2">{stats.avgBrokers} <span className="text-xs font-medium">profissionais/empresa</span></h4>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
               <h4 className="text-lg font-bold text-slate-800 mb-6">Volume de Equipe por Parceiro</h4>
               <div className="h-64">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={companies.slice(0, 8)}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                     <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                     <Bar dataKey="brokerCount" radius={[6, 6, 0, 0]} fill="#3b82f6" />
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>
            <div className="bg-slate-900 rounded-2xl p-6 shadow-xl text-white">
               <div className="flex justify-between items-center mb-6">
                 <h4 className="font-bold">IA Strategy</h4>
                 <button onClick={fetchAIInsights} disabled={loadingInsights} className="text-xs bg-white/10 px-3 py-1.5 rounded-lg hover:bg-white/20 transition-all">{loadingInsights ? '...' : 'Analisar'}</button>
               </div>
               <div className="text-xs leading-relaxed text-slate-400 italic">
                 {aiInsights || "Use a IA para identificar empresas com baixa atividade ou oportunidades de aumento de comissão."}
               </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'companies' && (
        <div className="space-y-6 animate-fadeIn">
          {!showForm ? (
            <>
              <div className="flex flex-col space-y-4 no-print">
                <div className="flex justify-between items-end">
                   <div>
                     <h3 className="text-xl font-bold text-slate-800">Parceiros Cadastrados</h3>
                     <p className="text-xs text-slate-500">Gerencie sua rede de imobiliárias e contatos.</p>
                   </div>
                   <div className="flex gap-3">
                     <button onClick={() => setActiveTab('prospecting')} className="px-5 py-3 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl font-bold shadow-sm hover:bg-indigo-100 transition-all active:scale-95 flex items-center gap-2">
                       <span>📡</span> Buscar Online
                     </button>
                     <button onClick={handleExportCSV} className="px-5 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold shadow-sm hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2">
                       <span>📊</span> Exportar CSV
                     </button>
                     <button onClick={() => setShowForm(true)} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all active:scale-95">Novo Parceiro</button>
                   </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                    <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Filtros da Rede</span>
                    <button onClick={handleClearFilters} className="text-[10px] font-bold text-slate-400 hover:text-red-500 uppercase flex items-center gap-1 transition-colors">
                      Limpar Filtros ✖
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Filtros Principais */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Imobiliária</label>
                        <input 
                          type="text" 
                          placeholder="Nome da empresa..." 
                          className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
                          value={nameFilter}
                          onChange={e => setNameFilter(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Status</label>
                        <select 
                          className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
                          value={statusFilter}
                          onChange={e => setStatusFilter(e.target.value)}
                        >
                          <option value="all">Todos os Status</option>
                          <option value="Ativo">Ativo</option>
                          <option value="Inativo">Inativo</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-indigo-600 ml-1">Número CRECI</label>
                        <input 
                          type="text" 
                          placeholder="Buscar CRECI..." 
                          className="w-full p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-500"
                          value={creciFilter}
                          onChange={e => setCreciFilter(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-indigo-600 ml-1">UF do CRECI</label>
                        <select 
                          className="w-full p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-500"
                          value={creciUfFilter}
                          onChange={e => setCreciUfFilter(e.target.value)}
                        >
                          <option value="all">Todas as UFs</option>
                          {BR_STATES.map(uf => (
                            <option key={uf} value={uf}>{uf}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Filtros Secundários */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-50">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">CNPJ / CPF</label>
                        <input 
                          type="text" 
                          placeholder="Apenas números..." 
                          className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 outline-none"
                          value={cnpjFilter}
                          onChange={e => setCnpjFilter(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Gestor do Hub</label>
                        <select 
                          className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 outline-none"
                          value={partnershipManagerFilter}
                          onChange={e => setPartnershipManagerFilter(e.target.value)}
                        >
                          <option value="all">Todos os Gestores</option>
                          {uniquePartnershipManagers.map(manager => (
                            <option key={manager} value={manager}>{manager}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-emerald-600 ml-1">Tipo de Contato</label>
                        <select 
                          className="w-full p-2.5 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-900 outline-none"
                          value={contactTypeFilter}
                          onChange={e => setContactTypeFilter(e.target.value)}
                        >
                          <option value="all">Interação (Qualquer)</option>
                          <option value="Telefone">📞 Telefone</option>
                          <option value="WhatsApp">💬 WhatsApp</option>
                          <option value="E-mail">📧 E-mail</option>
                          <option value="Reunião">🤝 Reunião</option>
                          <option value="Vídeo">🎥 Vídeo</option>
                          <option value="Visita">🏠 Visita</option>
                          <option value="Evento">🎟️ Evento</option>
                          <option value="Outros">⚙️ Outros</option>
                        </select>
                      </div>

                      <div className="flex gap-2">
                        <div className="space-y-1.5 flex-1">
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Mín. Equipe</label>
                          <input 
                            type="number" 
                            className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 outline-none"
                            value={minBrokers}
                            onChange={e => setMinBrokers(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5 flex-1">
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Máx. Equipe</label>
                          <input 
                            type="number" 
                            className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 outline-none"
                            value={maxBrokers}
                            onChange={e => setMaxBrokers(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b">
                    <tr className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-4">Parceiro / Identificação</th>
                      <th className="px-6 py-4">Relacionamento</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-center">Equipe</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredCompanies.length > 0 ? filteredCompanies.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800">{c.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {c.docType === 'CRECI' 
                              ? `CRECI: ${c.cnpj} / ${c.creciUF}` 
                              : `${c.docType}: ${c.cnpj}`}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Gestor Hub / Últ. Contato</p>
                          <p className="text-xs font-medium text-slate-700">{c.partnershipManager || 'N/A'}</p>
                          <p className="text-[10px] text-emerald-600 font-bold">{c.lastContactType ? `Última interação: ${c.lastContactType}` : 'Sem histórico'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${c.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'Ativo' ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-600">{c.brokerCount}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button onClick={() => setSelectedCompanyForDetails(c)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Ver Detalhes">👁️</button>
                          <button onClick={() => handleEdit(c)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Editar">✏️</button>
                          <button onClick={() => setCompanyToDelete(c)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">🗑️</button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                          <div className="flex flex-col items-center">
                            <span className="text-4xl mb-2 opacity-20">🔍</span>
                            <p>Nenhum parceiro encontrado com os filtros atuais.</p>
                          </div>
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
      {activeTab === 'reports' && <ReportsView companies={companies} onEdit={handleEdit} onDelete={(id) => setCompanyToDelete(companies.find(c => c.id === id) || null)} onView={setSelectedCompanyForDetails} />}
      
      {selectedCompanyForDetails && <CompanyDetailsModal company={selectedCompanyForDetails} onClose={() => setSelectedCompanyForDetails(null)} />}
      {companyToDelete && <DeleteConfirmationModal company={companyToDelete} onConfirm={() => { setCompanies(companies.filter(x => x.id !== companyToDelete.id)); setCompanyToDelete(null); }} onCancel={() => setCompanyToDelete(null)} />}
      {showShareModal && <ShareLinkModal url={publicRegistrationUrl} onClose={() => setShowShareModal(false)} />}
    </Layout>
  );
};

export default App;
