
import React from 'react';
import { Company } from '../types';

interface CompanyDetailsModalProps {
  company: Company;
  onClose: () => void;
}

export const CompanyDetailsModal: React.FC<CompanyDetailsModalProps> = ({ company, onClose }) => {
  const isUpcoming = (dateStr?: string) => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    return target >= today;
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'WhatsApp': return '💬';
      case 'Telefone': return '📞';
      case 'Reunião': return '🤝';
      case 'E-mail': return '📧';
      case 'Vídeo': return '🎥';
      case 'Visita': return '🏠';
      case 'Evento': return '🎟️';
      case 'Outros': return '⚙️';
      default: return '📱';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
          <h3 className="text-lg font-bold text-slate-800">Prontuário do Parceiro</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 text-2xl">×</button>
        </div>
        
        <div className="p-8 space-y-10 overflow-y-auto custom-scrollbar">
          {/* Top Info */}
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-3xl">🏢</div>
            <div>
              <h4 className="text-2xl font-black text-slate-900 leading-tight">{company.name}</h4>
              <p className="text-xs text-slate-500 font-mono mt-1">
                {company.docType === 'CRECI' 
                  ? `CRECI JURÍDICO ${company.creci} / ${company.creciUF}` 
                  : `${company.docType}: ${company.cnpj}`}
              </p>
              <div className="flex gap-2 mt-3">
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${company.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{company.status}</span>
                <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-700">{company.commissionRate}% Comissão</span>
                <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700">{company.brokerCount} Corretores</span>
              </div>
            </div>
          </div>

          {/* Contact Directory */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-100">
             <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Responsável</p>
               <p className="text-sm font-bold text-slate-700 truncate">{company.responsible}</p>
             </div>
             <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gestor da Parceria</p>
               <p className="text-sm font-bold text-slate-700 truncate">{company.partnershipManager || 'N/A'}</p>
             </div>
             <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gestor Hub</p>
               <p className="text-sm font-bold text-blue-600 truncate">{company.hiringManager}</p>
             </div>
          </div>

          {/* Associated Brokers List */}
          {company.brokers && company.brokers.length > 0 && (
            <div className="space-y-4">
              <h5 className="text-[10px] font-black text-amber-600 uppercase tracking-widest border-b border-amber-100 pb-2">Equipe de Corretores Associados</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {company.brokers.map(broker => (
                  <div key={broker.id} className="p-4 bg-amber-50/30 border border-amber-100 rounded-2xl">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">👤</div>
                      <p className="text-sm font-black text-slate-800 truncate">{broker.name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-amber-700">CRECI {broker.creci} / {broker.creciUF}</p>
                      <p className="text-[10px] text-slate-500 font-medium truncate">{broker.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-4">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Histórico de Relacionamento</h5>
            
            <div className="space-y-6 relative ml-4 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-100">
              {company.contactHistory && company.contactHistory.length > 0 ? (
                company.contactHistory.map((h, i) => (
                  <div key={h.id} className="relative pl-8 animate-fadeIn">
                    <div className={`absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ${i === 0 ? 'bg-blue-500 ring-4 ring-blue-50' : 'bg-slate-300'}`}></div>
                    <div className="bg-slate-50/30 p-4 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                          <span className="text-sm">{getIcon(h.type)}</span> {h.type}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">{new Date(h.date).toLocaleDateString('pt-BR')}</span>
                      </div>
                      
                      <h6 className="text-sm font-black text-slate-800 mb-1">{h.summary}</h6>
                      
                      {h.details && (
                        <div className="mt-2 p-3 bg-white/50 rounded-xl border border-slate-100 text-[11px] text-slate-600 whitespace-pre-wrap leading-relaxed italic">
                          "{h.details}"
                        </div>
                      )}

                      {h.nextContactDate && (
                        <div className={`mt-3 pt-3 border-t border-slate-100 text-[9px] font-bold flex items-center gap-2 ${isUpcoming(h.nextContactDate) ? 'text-blue-600' : 'text-slate-400'}`}>
                          <span>🗓️ Próximo contato agendado:</span>
                          <span className="bg-white px-2 py-0.5 rounded shadow-sm">{new Date(h.nextContactDate).toLocaleDateString('pt-BR')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic pl-8">Sem histórico registrado até o momento.</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-slate-50 px-8 py-5 flex justify-between border-t border-slate-200 flex-shrink-0">
          <div className="flex gap-3">
            <a href={`https://wa.me/55${company.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all flex items-center justify-center w-12 h-12 shadow-lg shadow-emerald-100">💬</a>
            <a href={`mailto:${company.email}`} className="p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all flex items-center justify-center w-12 h-12 shadow-lg shadow-blue-100">📧</a>
          </div>
          <button onClick={onClose} className="px-10 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-xl shadow-slate-200 transition-all hover:scale-[1.02] active:scale-95">Concluído</button>
        </div>
      </div>
    </div>
  );
};
