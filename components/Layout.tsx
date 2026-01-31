
import React, { useState, useRef, useEffect } from 'react';
import { Company } from '../types';

export type AppTab = 'dashboard' | 'companies' | 'map' | 'reports' | 'prospecting';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  companies: Company[];
  upcomingContacts: Company[];
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, companies, upcomingContacts }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getContactUrgency = (dateStr: string) => {
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
      return { label: 'Hoje', dotColor: 'bg-red-500', bgColor: 'bg-red-50', textColor: 'text-red-700' };
    }
    if (date.getTime() === tomorrow.getTime()) {
      return { label: 'Amanhã', dotColor: 'bg-amber-500', bgColor: 'bg-amber-50', textColor: 'text-amber-700' };
    }
    return { 
      label: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), 
      dotColor: 'bg-blue-400', 
      bgColor: 'bg-blue-50', 
      textColor: 'text-blue-700' 
    };
  };

  const NavItem = ({ tab, icon, label }: { tab: AppTab, icon: string, label: string }) => (
    <button 
      onClick={() => setActiveTab(tab)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
    >
      <span className="text-lg">{icon}</span>
      {label}
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl no-print flex-shrink-0 z-50">
        <div className="p-8 border-b border-slate-800/50">
          <h1 className="text-xl font-black flex items-center gap-3 tracking-tight">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-inner">PH</div>
            PartnerHub <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30">PRO</span>
          </h1>
        </div>
        
        <div className="flex-1 px-4 py-6 space-y-8 overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Principal</p>
            <NavItem tab="dashboard" icon="📊" label="Visão Executiva" />
            <NavItem tab="prospecting" icon="📡" label="Radar de Expansão" />
          </div>

          <div className="space-y-1">
            <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">CRM Operacional</p>
            <NavItem tab="companies" icon="📋" label="Base de Parceiros" />
            <NavItem tab="map" icon="📍" label="Mapa de Calor" />
          </div>

          <div className="space-y-1">
            <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Inteligência</p>
            <NavItem tab="reports" icon="📄" label="Central de BI" />
          </div>
        </div>

        <div className="p-6 mt-auto border-t border-slate-800/50 bg-slate-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center font-black text-xs border border-slate-700 shadow-xl">AD</div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-200 truncate">Sérgio Rodrigues</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Online</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 sticky top-0 z-40 flex-shrink-0 no-print shadow-sm">
          <div className="flex-1 max-w-xl">
             <div className="relative group">
               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">🔍</span>
               <input 
                type="text" 
                placeholder="Pesquisa rápida de parceiros, CNPJ ou gestores..." 
                className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
               />
               <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                 <kbd className="hidden sm:inline-block px-1.5 py-1 text-[10px] font-black bg-slate-200 text-slate-500 rounded border border-slate-300">CTRL</kbd>
                 <kbd className="hidden sm:inline-block px-1.5 py-1 text-[10px] font-black bg-slate-200 text-slate-500 rounded border border-slate-300">K</kbd>
               </div>
             </div>
          </div>
          
          <div className="flex items-center gap-6 ml-6">
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-3 rounded-2xl transition-all relative ${showNotifications ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
              >
                <span className="text-xl">🔔</span>
                {upcomingContacts.length > 0 && (
                  <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-[3px] border-white shadow-lg">
                    {upcomingContacts.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-4 w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-slideUp z-50">
                  <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.1em]">Alertas de Relacionamento</h4>
                      <p className="text-[10px] text-slate-500 font-medium">Interações agendadas para os próximos 7 dias</p>
                    </div>
                  </div>
                  
                  <div className="max-h-[30rem] overflow-y-auto custom-scrollbar">
                    {upcomingContacts.length > 0 ? (
                      <div className="divide-y divide-slate-100">
                        {upcomingContacts.map(company => {
                          const urgency = getContactUrgency(company.nextContactDate!);
                          return (
                            <div key={company.id} className="p-5 hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => { setActiveTab('companies'); setShowNotifications(false); }}>
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                  <div className={`w-2.5 h-2.5 rounded-full ${urgency.dotColor} flex-shrink-0 ${urgency.label === 'Hoje' ? 'animate-pulse' : ''}`}></div>
                                  <p className="text-sm font-black text-slate-800 group-hover:text-blue-600 transition-colors truncate">{company.name}</p>
                                </div>
                                <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest shadow-sm ${urgency.bgColor} ${urgency.textColor}`}>
                                  {urgency.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 ml-5">
                                <span className="text-[10px] text-slate-400 font-bold">Ext: {company.partnershipManager || company.responsible}</span>
                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                <span className="text-[10px] text-blue-500 font-black uppercase">Hub: {company.hiringManager}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 opacity-40">☕</div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Sem pendências críticas</p>
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                    <button onClick={() => setActiveTab('companies')} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Ver Agenda Completa</button>
                  </div>
                </div>
              )}
            </div>

            <div className="h-10 w-[1px] bg-slate-200"></div>
            
            <div className="flex flex-col items-end">
              <p className="text-xs font-black text-slate-900 uppercase tracking-tighter">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date().toLocaleDateString('pt-BR', { weekday: 'long' })}</p>
            </div>
          </div>
        </header>

        <div className={`flex-1 overflow-auto ${activeTab === 'map' ? 'p-0' : 'p-10'} print:p-0 relative`}>
          {children}
        </div>
      </main>
    </div>
  );
};
