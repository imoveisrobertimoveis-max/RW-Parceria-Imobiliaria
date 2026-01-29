
import React, { useState, useMemo, useRef, useEffect } from 'react';
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

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl no-print flex-shrink-0">
        <div className="p-6">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="bg-blue-600 p-1.5 rounded-lg">🏢</span>
            PartnerHub
          </h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            📊 Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('companies')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'companies' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            📋 Empresas
          </button>
          <button 
            onClick={() => setActiveTab('prospecting')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'prospecting' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            📡 Prospecção IA
          </button>
          <button 
            onClick={() => setActiveTab('map')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'map' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            📍 Mapa
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'reports' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            📄 Relatórios
          </button>
        </nav>

        <div className="p-4 mt-auto border-t border-slate-800">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs">ADM</div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">Administrador</p>
              <p className="text-[10px] text-slate-500">Sistema Online</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40 flex-shrink-0 no-print">
          <h2 className="text-lg font-semibold text-slate-800 capitalize">
            {activeTab === 'prospecting' ? '📡 Radar de Prospecção IA' : activeTab === 'reports' ? 'Relatórios Gerais' : activeTab}
          </h2>
          
          <div className="flex items-center gap-4">
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-xl transition-all relative ${showNotifications ? 'bg-slate-100 text-blue-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
              >
                <span className="text-xl">🔔</span>
                {upcomingContacts.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                    {upcomingContacts.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-slideDown z-50">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Próximos Contatos</h4>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Próximos 7 dias</span>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {upcomingContacts.length > 0 ? (
                      <div className="divide-y divide-slate-100">
                        {upcomingContacts.map(company => {
                          const urgency = getContactUrgency(company.nextContactDate!);
                          return (
                            <div key={company.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => { setActiveTab('companies'); setShowNotifications(false); }}>
                              <div className="flex justify-between items-start mb-1">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <div className={`w-2 h-2 rounded-full ${urgency.dotColor} flex-shrink-0 ${urgency.label === 'Hoje' ? 'animate-pulse' : ''}`}></div>
                                  <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate">{company.name}</p>
                                </div>
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded whitespace-nowrap ${urgency.bgColor} ${urgency.textColor}`}>
                                  {urgency.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <span className="text-[10px] text-slate-400 font-medium">Resp: {company.responsible}</span>
                                <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                <span className="text-[10px] text-slate-400 font-medium italic truncate">{company.hiringManager}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <div className="text-3xl mb-2 opacity-20">📭</div>
                        <p className="text-xs text-slate-400 font-medium">Nenhum agendamento pendente para a semana.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="h-8 w-[1px] bg-slate-200"></div>
            <p className="text-sm text-slate-500 font-medium hidden md:block">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
          </div>
        </header>

        <div className={`flex-1 overflow-auto ${activeTab === 'map' ? 'p-0' : 'p-8'} print:p-0 relative`}>
          {children}
        </div>
      </main>
    </div>
  );
};
