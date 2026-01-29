
import React from 'react';
import { Company } from '../types';

interface DeleteConfirmationModalProps {
  company: Company;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ company, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 transform animate-scaleIn">
        <div className="p-10 text-center">
          <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-5xl mx-auto mb-6 relative">
            <span className="animate-ping absolute inset-0 rounded-full bg-red-400 opacity-20"></span>
            <span className="relative">⚠️</span>
          </div>
          
          <h3 className="text-2xl font-black text-slate-900 mb-3">Confirmar Exclusão?</h3>
          
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
            <p className="text-sm text-slate-500 mb-1 font-medium">Você está removendo permanentemente:</p>
            <p className="text-lg font-bold text-slate-800 tracking-tight">{company.name}</p>
            <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-widest">{company.cnpj}</p>
          </div>
          
          <p className="text-xs text-slate-400 leading-relaxed px-4">
            Ao confirmar, todos os históricos de contato, dados de corretores e métricas desta imobiliária serão removidos da base de dados. <span className="text-red-500 font-bold">Esta ação não pode ser desfeita.</span>
          </p>
        </div>
        
        <div className="bg-slate-50 p-6 flex flex-col sm:flex-row gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-6 py-4 bg-white text-slate-600 border border-slate-200 rounded-2xl font-bold hover:bg-slate-100 transition-all active:scale-95"
          >
            Não, Manter Parceiro
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-xl shadow-red-200 active:scale-95"
          >
            Sim, Excluir Agora
          </button>
        </div>
      </div>
    </div>
  );
};
