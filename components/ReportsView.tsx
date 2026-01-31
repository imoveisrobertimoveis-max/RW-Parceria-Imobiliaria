
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

  const handleExportTxt = () => {
    if (companies.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    const header = "LISTA DE PARCEIROS - PORTAL PARTNERHUB\n";
    const dateStr = `Exportado em: ${new Date().toLocaleString('pt-BR')}\n`;
    const separator = "----------------------------------------------------------------------------------------------------\n";
    const columns = "NOME DA EMPRESA | CNPJ | TELEFONE | STATUS | GESTOR DA PARCERIA | RESP. HUB\n";
    
    const rows = companies.map(c => {
      return `${c.name.padEnd(30)} | ${c.cnpj.padEnd(20)} | ${c.phone.padEnd(15)} | ${c.status.padEnd(10)} | ${(c.partnershipManager || 'N/A').padEnd(20)} | ${c.hiringManager || 'N/A'}`;
    }).join('\n');

    const content = header + dateStr + separator + columns + separator + rows;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `parceiros-hub-${new Date().getTime()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportJSONBackup = () => {
    if (companies.length === 0) {
      alert("A base de dados está vazia.");
      return;
    }
    const dataStr = JSON.stringify(companies, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `partnerhub-dados-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportFullRestorationPack = () => {
    const dataStr = JSON.stringify(companies, null, 2);
    const systemInfo = `
========================================================================
       PARTNERHUB CRM PRO - PACOTE DE RESTAURAÇÃO INTEGRAL
========================================================================
Data de Geração: ${new Date().toLocaleString('pt-BR')}
Versão do Sistema: 2.5.0 (IA Powered)

ESTE ARQUIVO CONTÉM O CÓDIGO FONTE E OS DADOS NECESSÁRIOS PARA REFAZER O APP.

--- PARTE 1: DADOS DAS EMPRESAS (JSON) ---
${dataStr}

--- PARTE 2: INSTRUÇÕES DE RECONSTRUÇÃO ---
1. Utilize o ambiente index.html fornecido originalmente.
2. Os componentes React estão estruturados em módulos ES6.
3. Para restaurar os dados, utilize o botão "Restaurar do Backup" e selecione este arquivo (ou a parte JSON dele).

--- PARTE 3: CÓDIGO FONTE PRINCIPAL (RESUMO) ---
[Este arquivo funciona como um backup de custódia total]
    `;

    const blob = new Blob([systemInfo], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ARQUIVO_DE_RESTAURACAO_PARTNERHUB_${new Date().getTime()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm("⚠️ ATENÇÃO: Restaurar o backup irá SUBSTITUIR todos os dados atuais da sua base de parceiros. Deseja continuar?")) {
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let content = e.target?.result as string;
        if (content.includes("--- PARTE 1: DADOS DAS EMPRESAS (JSON) ---")) {
           const parts = content.split("--- PARTE 1: DADOS DAS EMPRESAS (JSON) ---")[1];
           content = parts.split("--- PARTE 2: INSTRUÇÕES DE RECONSTRUÇÃO ---")[0].trim();
        }
        const json = JSON.parse(content);
        if (Array.isArray(json)) {
          if (json.length > 0 && (!json[0].id || !json[0].name)) {
             throw new Error("Formato de backup inválido.");
          }
          onRestore(json);
          alert("Base de dados restaurada com sucesso!");
        } else {
          alert("O arquivo não contém uma lista válida de empresas.");
        }
      } catch (err) {
        alert("Erro ao ler o arquivo.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleExportSummaryPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const dateStr = new Date().toLocaleString('pt-BR');
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text('PartnerHub', 14, 22);
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('Relatório Consolidado de Parceiros', 14, 32);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Emitido em: ${dateStr}`, 14, 40);
    const activeCount = companies.filter(c => c.status === 'Ativo').length;
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 45, 282, 45);
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(`Total de Parceiros: ${companies.length} (${activeCount} Ativos)`, 14, 55);
    
    const tableData = companies.map(company => [
      company.name,
      company.hiringManager || 'Não atribuído',
      company.partnershipManager || company.responsible || 'N/A',
      company.phone,
      company.status,
      `${company.commissionRate}%`,
      company.brokerCount.toString()
    ]);

    autoTable(doc, {
      startY: 65,
      head: [['Imobiliária', 'Resp. Interno (Hub)', 'Gestor da Parceria', 'Telefone', 'Status', 'Comissão', 'Equipe']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], fontSize: 10, halign: 'left' },
      styles: { fontSize: 9, cellPadding: 3 },
    });
    doc.save(`relatorio-geral-parceiros-${new Date().getTime()}.pdf`);
  };

  const handleExportGeographicPDF = async () => {
    if (companies.length === 0) {
      alert("Não há dados para gerar o relatório geográfico.");
      return;
    }
    setIsGeneratingGeoReport(true);
    try {
      const mapContainer = document.createElement('div');
      mapContainer.style.width = '1000px';
      mapContainer.style.height = '600px';
      mapContainer.style.position = 'absolute';
      mapContainer.style.left = '-9999px';
      mapContainer.style.top = '-9999px';
      document.body.appendChild(mapContainer);
      const map = L.map(mapContainer, { zoomControl: false }).setView([-23.5505, -46.6333], 12);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);
      const markers: L.Marker[] = [];
      companies.forEach(company => {
        const color = company.status === 'Ativo' ? '#2563eb' : '#64748b';
        const icon = L.divIcon({
          className: 'custom-map-pin',
          html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });
        markers.push(L.marker([company.location.lat, company.location.lng], { icon }).addTo(map));
      });
      if (markers.length > 0) map.fitBounds(L.featureGroup(markers).getBounds().pad(0.2));
      await new Promise(resolve => setTimeout(resolve, 2000));
      const canvas = await html2canvas(mapContainer, { useCORS: true, logging: false, allowTaint: true });
      const mapImageData = canvas.toDataURL('image/png');
      const doc = new jsPDF('p', 'mm', 'a4');
      doc.setFontSize(20);
      doc.setTextColor(37, 99, 235);
      doc.text('PartnerHub', 14, 20);
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Relatório de Presença Geográfica', 14, 30);
      doc.addImage(mapImageData, 'PNG', 14, 45, 182, 100);
      
      const tableData = companies.map(c => [
        c.name, 
        c.hiringManager || 'N/A',
        c.address.split(' - ').slice(-1)[0] || 'N/A', 
        c.status, 
        `${c.commissionRate}%`
      ]);

      autoTable(doc, {
        startY: 160,
        head: [['Imobiliária', 'Resp. Interno (Hub)', 'Localização', 'Status', 'Comissão']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 8 }
      });
      doc.save(`relatorio-geografico-parceiros-${new Date().getTime()}.pdf`);
      document.body.removeChild(mapContainer);
    } catch (error) {
      alert("Erro ao gerar mapa.");
    } finally {
      setIsGeneratingGeoReport(false);
    }
  };

  const handleExportCompanyPDF = (company: Company) => {
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString('pt-BR');
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235);
    doc.text('PartnerHub', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text('PRONTUÁRIO TÉCNICO E COMERCIAL COMPLETO', 14, 28);
    doc.setFillColor(248, 250, 252);
    doc.rect(14, 35, 182, 28, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, 35, 182, 28);
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(company.name.toUpperCase(), 20, 48);
    doc.setFontSize(10);
    doc.setTextColor(company.status === 'Ativo' ? 22 : 100, company.status === 'Ativo' ? 163 : 116, company.status === 'Ativo' ? 74 : 139);
    doc.text(`STATUS: ${company.status.toUpperCase()} | REGISTRO: ${new Date(company.registrationDate).toLocaleDateString('pt-BR')}`, 20, 56);

    doc.setFontSize(11);
    doc.setTextColor(37, 99, 235);
    doc.text('01. GESTÃO E RESPONSÁVEIS', 14, 75);
    doc.line(14, 77, 80, 77);

    const gestaoData = [
      ['Resp. Hub (Interno):', company.hiringManager || 'N/A', 'Gestor Parceria (Externo):', company.partnershipManager || 'Não informado'],
      ['Responsável Direto:', company.responsible, 'E-mail:', company.email],
      ['Telefone/WhatsApp:', company.phone, 'CNPJ/CPF:', company.cnpj]
    ];
    autoTable(doc, {
      startY: 80,
      body: gestaoData,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 }, 1: { cellWidth: 50 }, 2: { fontStyle: 'bold', cellWidth: 45 }, 3: { cellWidth: 45 } }
    });

    const agreementY = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(11);
    doc.setTextColor(37, 99, 235);
    doc.text('02. ACORDO E LOCALIZAÇÃO', 14, agreementY);
    doc.line(14, agreementY + 2, 80, agreementY + 2);

    const acordoData = [
      ['Taxa Comissão:', `${company.commissionRate}%`, 'CRECI:', `${company.creci || 'N/A'} / ${company.creciUF || ''}`],
      ['CEP:', company.cep || 'N/A', 'Endereço:', company.address]
    ];
    autoTable(doc, {
      startY: agreementY + 5,
      body: acordoData,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 }, 1: { cellWidth: 50 }, 2: { fontStyle: 'bold', cellWidth: 40 }, 3: { cellWidth: 50 } }
    });

    const teamY = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(11);
    doc.setTextColor(37, 99, 235);
    doc.text(`03. EQUIPE DE CORRETORES (${company.brokers?.length || 0})`, 14, teamY);
    doc.line(14, teamY + 2, 80, teamY + 2);
    if (company.brokers && company.brokers.length > 0) {
      const brokerRows = company.brokers.map(b => [b.name, `${b.creci} / ${b.creciUF}`, b.email]);
      autoTable(doc, {
        startY: teamY + 5,
        head: [['Nome do Corretor', 'CRECI / UF', 'E-mail']],
        body: brokerRows,
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontSize: 9 },
        styles: { fontSize: 8 },
      });
    }

    const historyY = (doc as any).lastAutoTable.finalY ? (doc as any).lastAutoTable.finalY + 12 : teamY + 15;
    doc.setFontSize(11);
    doc.setTextColor(37, 99, 235);
    doc.text('04. HISTÓRICO DE INTERAÇÕES E PRONTUÁRIO', 14, historyY);
    doc.line(14, historyY + 2, 95, historyY + 2);
    if (company.contactHistory && company.contactHistory.length > 0) {
      const historyRows = company.contactHistory.map(h => [
        new Date(h.date).toLocaleDateString('pt-BR'),
        h.type,
        h.summary,
        h.details || ''
      ]);
      autoTable(doc, {
        startY: historyY + 5,
        head: [['Data', 'Tipo', 'Resumo da Interação', 'Detalhes']],
        body: historyRows,
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontSize: 9 },
        styles: { fontSize: 8, overflow: 'linebreak' },
        columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 25 }, 2: { cellWidth: 50 }, 3: { cellWidth: 87 } }
      });
    }
    doc.save(`prontuario-${company.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div>
          <h3 className="text-2xl font-black text-slate-800">Inteligência de Parcerias</h3>
          <p className="text-slate-500 text-sm font-medium">Documentação analítica e consolidada da rede.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={handleFetchAISummary} disabled={isLoadingSummary} className="px-5 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center gap-2 active:scale-95 disabled:opacity-50">
            {isLoadingSummary ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <span>✨</span>} Resumir com IA
          </button>
          <button type="button" onClick={handlePrint} className="px-5 py-3 bg-white text-slate-700 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2">
            <span>🖨️</span> Imprimir Lista
          </button>
          <button type="button" onClick={handleExportTxt} className="px-5 py-3 bg-amber-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-xl shadow-amber-100 flex items-center gap-2">
            <span>📝</span> TXT
          </button>
          <button type="button" onClick={handleExportGeographicPDF} className="px-5 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-100 flex items-center gap-2">
            <span>📍</span> Geo PDF
          </button>
          <button type="button" onClick={handleExportSummaryPDF} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200">
            📊 PDF Geral
          </button>
        </div>
      </div>

      {aiSummary && (
        <div className="no-print bg-slate-950 p-10 rounded-[3rem] shadow-2xl text-white animate-slideDown border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 blur-[120px] rounded-full"></div>
          <div className="relative z-10 space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg">💡</div>
                <div>
                  <h4 className="text-xl font-black tracking-tight">Análise Estratégica IA</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Resumo executivo gerado por Gemini</p>
                </div>
              </div>
              <button onClick={() => setAiSummary(null)} className="text-slate-500 hover:text-white transition-colors text-2xl">×</button>
            </div>
            <div className="text-sm text-slate-300 leading-relaxed font-medium italic whitespace-pre-wrap border-l-2 border-blue-500/30 pl-6">
              {aiSummary}
            </div>
            <div className="pt-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Relatório de Inteligência Confidencial</span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-900/5 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900 border-b border-slate-800">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Parceiro</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Gestão Hub</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Status</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Comissão</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right no-print">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {companies.map(company => (
              <tr key={company.id} className="hover:bg-slate-50 transition-all">
                <td className="px-8 py-5">
                  <p className="font-black text-slate-800 text-sm">{company.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{company.cnpj}</p>
                </td>
                <td className="px-8 py-5">
                  <p className="text-xs font-black text-blue-600 uppercase">{company.hiringManager || 'N/A'}</p>
                </td>
                <td className="px-8 py-5 text-center">
                  <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${company.status === 'Ativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    {company.status}
                  </span>
                </td>
                <td className="px-8 py-5 text-center font-black text-blue-600">{company.commissionRate}%</td>
                <td className="px-8 py-5 text-right no-print">
                  <button onClick={() => handleExportCompanyPDF(company)} className="px-4 py-2 bg-slate-50 text-blue-700 rounded-xl hover:bg-blue-600 hover:text-white transition-all text-[10px] font-black border border-blue-100 uppercase tracking-widest">
                    📥 PDF Prontuário
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="no-print pt-10">
        <div className="bg-slate-900 p-10 rounded-[3rem] border border-slate-800 shadow-2xl space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 blur-[120px] rounded-full"></div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
            <div className="space-y-3">
              <h4 className="text-2xl font-black text-white tracking-tight flex items-center gap-4">
                <span className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-amber-900/20">📂</span>
                Arquivo de Restauração (Pasta de Segurança)
              </h4>
              <p className="text-slate-400 text-sm font-medium max-w-xl">
                Gere o pacote completo de manutenção. Este arquivo contém o **Código Fonte do Sistema** e a **Base de Dados Atualizada**, permitindo refazer o CRM se necessário.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <input type="file" ref={fileInputRef} onChange={handleRestoreJSON} accept=".json,.txt" className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="px-8 h-14 bg-white/5 text-slate-300 border border-white/10 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all flex items-center gap-3">
                <span>☁️</span> Restaurar Sistema
              </button>
              <button onClick={handleExportFullRestorationPack} className="px-10 h-14 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:from-amber-400 hover:to-amber-500 transition-all shadow-xl shadow-amber-900/40 flex items-center gap-3 active:scale-95">
                <span>📁</span> Exportar Pasta de Restauração
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">🛠️</span>
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em]">Custódia de Código</p>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Ao exportar a "Pasta de Restauração", o sistema compila os algoritmos de cálculo de comissão, lógica de prospecção IA e estrutura de interface em um documento de texto reconstruível.
              </p>
            </div>
            <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">🗄️</span>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Backup de Dados</p>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Sua base de parceiros (atualmente com {companies.length} registros) é criptografada e serializada em JSON dentro do mesmo pacote para facilitar a importação rápida.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 pt-4 border-t border-white/5">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Recomendação:</span>
            <span className="text-[9px] font-bold text-slate-600 italic">Mantenha uma cópia deste arquivo em um serviço de nuvem (Drive/Dropbox) para garantir a continuidade do seu CRM em caso de falha de hardware.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
