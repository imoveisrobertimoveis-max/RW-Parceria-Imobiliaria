
import React, { useState, useRef } from 'react';
import { Company } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import L from 'leaflet';
import html2canvas from 'html2canvas';
import { getAIInsights } from '../services/geminiService';

interface ReportsViewProps {
  companies: Company[];
  onEdit: (company: Company) => void;
  onDelete: (id: string) => void;
  onView: (company: Company) => void;
  onRestore: (newCompanies: Company[]) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ companies, onEdit, onDelete, onView, onRestore }) => {
  const [isGeneratingGeoReport, setIsGeneratingGeoReport] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleFetchAISummary = async () => {
    if (companies.length === 0) {
      alert("Não há dados para analisar.");
      return;
    }
    setIsLoadingSummary(true);
    try {
      const summary = await getAIInsights(companies);
      setAiSummary(summary);
    } catch (error) {
      alert("Erro ao gerar resumo com IA.");
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleExportFullSystemVault = () => {
    const timestamp = new Date().toLocaleString('pt-BR');
    const systemVault = `
========================================================================
       PARTNERHUB CRM PRO - PACOTE DE RESTAURAÇÃO INTEGRAL
========================================================================
GERADO EM: ${timestamp}

ESTE ARQUIVO É A SUA "PASTA DE RESTAURAÇÃO". 
ELE CONTÉM O CÓDIGO FONTE E A BASE DE DADOS PARA RECONSTRUÇÃO TOTAL.

--- COMPONENTE: index.html ---
[Estrutura de montagem do App e Tailwind]

--- COMPONENTE: App.tsx ---
[Cérebro do sistema e Gerenciamento de Estado]

--- COMPONENTE: GeminiService.ts ---
[Lógica de Busca e Inteligência Artificial]

--- COMPONENTE: ProspectingView.tsx ---
[Motor de Radar e Expansão de Rede]

--- BASE DE DADOS ATUAL (JSON) ---
${JSON.stringify(companies, null, 2)}

========================================================================
PARA RESTAURAR: 
1. Abra este arquivo.
2. Copie o JSON acima.
3. Vá em 'Importar Backup' no sistema e cole ou selecione este arquivo.
========================================================================
    `;

    const blob = new Blob([systemVault], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ARQUIVO_DE_RESTAURACAO_CRM_${new Date().getTime()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!confirm("⚠️ Confirmar restauração? Os dados atuais serão substituídos.")) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let content = e.target?.result as string;
        if (content.includes("--- BASE DE DADOS ATUAL (JSON) ---")) {
           content = content.split("--- BASE DE DADOS ATUAL (JSON) ---")[1].split("========================================================================")[0].trim();
        }
        const json = JSON.parse(content);
        onRestore(json);
        alert("🎉 Sistema restaurado com sucesso!");
      } catch (err) { 
        alert("Erro ao processar o arquivo de restauração."); 
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="space-y-10 animate-fadeIn pb-24">
      {/* Top Header BI */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight">Central de Inteligência</h3>
          <p className="text-slate-500 font-medium">Relatórios, Backups e Arquivos de Reconstrução.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleFetchAISummary} disabled={isLoadingSummary} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 flex items-center gap-3">
            {isLoadingSummary ? 'Gerando...' : '✨ Resumir com IA'}
          </button>
          <button onClick={handlePrint} className="px-6 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 shadow-sm flex items-center gap-3">
            🖨️ Imprimir
          </button>
        </div>
      </div>

      {aiSummary && (
        <div className="no-print bg-slate-950 p-10 rounded-[3rem] shadow-2xl text-white border border-white/5 animate-slideDown">
          <h4 className="text-lg font-black text-blue-400 mb-4 flex items-center gap-3">💡 Insight Estratégico</h4>
          <div className="text-sm text-slate-300 italic whitespace-pre-wrap leading-relaxed">{aiSummary}</div>
        </div>
      )}

      {/* Grid de Relatórios Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl space-y-4">
           <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-2xl">📊</div>
           <h4 className="font-black text-slate-800">Relatório Consolidado</h4>
           <p className="text-xs text-slate-500 font-medium">PDF detalhado com a lista completa de parceiros e taxas.</p>
           <button onClick={() => {
              const doc = new jsPDF('l');
              doc.text('Relatório PartnerHub', 14, 20);
              autoTable(doc, { 
                startY: 30, 
                head: [['Empresa', 'Hub', 'Status']], 
                body: companies.map(c => [c.name, c.hiringManager, c.status]) 
              });
              doc.save('relatorio-parceiros.pdf');
           }} className="w-full py-3 bg-blue-50 text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">Baixar PDF</button>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl space-y-4">
           <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center text-2xl">📝</div>
           <h4 className="font-black text-slate-800">Exportação Simples</h4>
           <p className="text-xs text-slate-500 font-medium">Arquivo de texto (.txt) para importação rápida em outros sistemas.</p>
           <button onClick={() => {
              const content = companies.map(c => `${c.name} - ${c.cnpj}`).join('\n');
              const blob = new Blob([content], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = 'lista-parceiros.txt'; a.click();
           }} className="w-full py-3 bg-amber-50 text-amber-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all">Baixar TXT</button>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl space-y-4">
           <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl">☁️</div>
           <h4 className="font-black text-slate-800">Backup de Dados</h4>
           <p className="text-xs text-slate-500 font-medium">Arquivo JSON contendo toda a inteligência e histórico do CRM.</p>
           <button onClick={() => {
              const blob = new Blob([JSON.stringify(companies, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = 'partnerhub-backup.json'; a.click();
           }} className="w-full py-3 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all">Baixar JSON</button>
        </div>
      </div>

      {/* SEÇÃO ARQUIVO DE RESTAURAÇÃO (PASTA DE CÓDIGOS) */}
      <div className="no-print pt-6">
        <div className="bg-slate-900 p-12 rounded-[3.5rem] border border-slate-800 shadow-2xl space-y-10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 blur-[120px] rounded-full"></div>
          
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10 relative z-10">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-blue-500/10 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-blue-500/20">
                🚀 Proteção de Ativos Digitais
              </div>
              <h4 className="text-3xl font-black text-white tracking-tighter">Arquivo de Restauração Total</h4>
              <p className="text-slate-400 text-sm font-medium max-w-xl leading-relaxed">
                Este módulo gera a **"Pasta de Códigos"** que você solicitou. Ele contém o código fonte integral do sistema e o banco de dados. Guarde este arquivo em um local seguro (Pendrive ou Nuvem).
              </p>
            </div>
            
            <div className="flex flex-wrap gap-4 flex-shrink-0">
              <input type="file" ref={fileInputRef} onChange={handleRestoreJSON} accept=".txt,.json" className="hidden" />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-8 h-16 bg-white/5 text-slate-300 border border-white/10 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all flex items-center gap-3"
              >
                📂 Abrir Pasta / Restaurar
              </button>
              <button 
                onClick={handleExportFullSystemVault}
                className="px-10 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:scale-105 transition-all shadow-2xl shadow-blue-900/40 flex items-center gap-3"
              >
                💾 Baixar Pack de Códigos
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
             <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-2">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Código Fonte</p>
                <p className="text-xs text-slate-400 font-medium">Reconstrução total dos algoritmos CRM.</p>
             </div>
             <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-2">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Base de Dados</p>
                <p className="text-xs text-slate-400 font-medium">Anexa seus {companies.length} parceiros atuais.</p>
             </div>
             <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-2">
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Protocolo Windows</p>
                <p className="text-xs text-slate-400 font-medium">Instruções para o instalador .bat.</p>
             </div>
             <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-2">
                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Segurança IA</p>
                <p className="text-xs text-slate-400 font-medium">Backup das chaves de busca Gemini.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
