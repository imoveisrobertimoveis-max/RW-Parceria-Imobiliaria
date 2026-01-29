
import React, { useState } from 'react';
import { Company } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import L from 'leaflet';
import html2canvas from 'html2canvas';

interface ReportsViewProps {
  companies: Company[];
  onEdit: (company: Company) => void;
  onDelete: (id: string) => void;
  onView: (company: Company) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ companies, onEdit, onDelete, onView }) => {
  const [isGeneratingGeoReport, setIsGeneratingGeoReport] = useState(false);

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleExportTxt = () => {
    if (companies.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    const header = "LISTA DE PARCEIROS - PORTAL PARTNERHUB\n";
    const dateStr = `Exportado em: ${new Date().toLocaleString('pt-BR')}\n`;
    const separator = "----------------------------------------------------------------------------------------------------\n";
    const columns = "NOME DA EMPRESA | CNPJ | TELEFONE | STATUS | GESTOR DA PARCERIA\n";
    
    const rows = companies.map(c => {
      return `${c.name.padEnd(30)} | ${c.cnpj.padEnd(20)} | ${c.phone.padEnd(15)} | ${c.status.padEnd(10)} | ${c.partnershipManager || 'N/A'}`;
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
      company.hiringManager,
      company.partnershipManager || company.responsible,
      company.phone,
      company.status,
      `${company.commissionRate}%`,
      company.brokerCount.toString()
    ]);
    autoTable(doc, {
      startY: 65,
      head: [['Imobiliária', 'Resp. Interno', 'Gestor da Parceria', 'Telefone', 'Status', 'Comissão', 'Equipe']],
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
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
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
      const tableData = companies.map(c => [c.name, c.cnpj, c.address.split(' - ').pop() || 'N/A', c.status, `${c.commissionRate}%`]);
      autoTable(doc, {
        startY: 160,
        head: [['Imobiliária', 'Documento', 'Localização', 'Status', 'Comissão']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 8 }
      });
      doc.save(`relatorio-geografico-parceiros-${new Date().getTime()}.pdf`);
      document.body.removeChild(mapContainer);
    } catch (error) {
      console.error(error);
      alert("Houve um erro ao processar o mapa.");
    } finally {
      setIsGeneratingGeoReport(false);
    }
  };

  const handleExportCompanyPDF = (company: Company) => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleString('pt-BR');
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235);
    doc.text('PartnerHub', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text('PRONTUÁRIO TÉCNICO E COMERCIAL INDIVIDUAL', 14, 28);
    doc.setFillColor(248, 250, 252);
    doc.rect(14, 35, 182, 25, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, 35, 182, 25);
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(company.name.toUpperCase(), 20, 48);
    doc.setFontSize(10);
    doc.setTextColor(company.status === 'Ativo' ? 22 : 100, company.status === 'Ativo' ? 163 : 116, company.status === 'Ativo' ? 74 : 139);
    doc.text(`STATUS ATUAL: ${company.status.toUpperCase()}`, 20, 54);

    doc.setFontSize(11);
    doc.setTextColor(37, 99, 235);
    doc.text('01. GESTÃO E RESPONSÁVEIS', 14, 75);
    doc.line(14, 77, 70, 77);

    const gestaoData = [
      ['Resp. Operacional:', company.responsible, 'Gestor da Parceria:', company.partnershipManager || 'Não informado'],
      ['Gestor Hub:', company.hiringManager, 'Email:', company.email],
      ['Telefone:', company.phone, 'Início Parceria:', new Date(company.registrationDate).toLocaleDateString('pt-BR')]
    ];

    autoTable(doc, {
      startY: 80,
      body: gestaoData,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 }, 1: { cellWidth: 50 }, 2: { fontStyle: 'bold', cellWidth: 40 }, 3: { cellWidth: 50 } }
    });

    const agreementY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(11);
    doc.setTextColor(37, 99, 235);
    doc.text('02. ACORDO E LOCALIZAÇÃO', 14, agreementY);
    doc.line(14, agreementY + 2, 70, agreementY + 2);

    const acordoData = [
      ['Taxa Comissão:', `${company.commissionRate}%`, 'Equipe:', `${company.brokerCount} corretores`],
      ['CEP:', company.cep, 'Endereço:', company.address]
    ];

    autoTable(doc, {
      startY: agreementY + 5,
      body: acordoData,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 }, 1: { cellWidth: 50 }, 2: { fontStyle: 'bold', cellWidth: 40 }, 3: { cellWidth: 50 } }
    });

    doc.save(`prontuario-${company.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Relatórios de Parcerias</h3>
          <p className="text-slate-500 text-sm">Gere documentação completa para reuniões e auditorias.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={handlePrint} className="px-4 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2">
            <span>🖨️</span> Imprimir Lista
          </button>
          <button type="button" onClick={handleExportTxt} className="px-5 py-2.5 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-all shadow-lg shadow-amber-100 flex items-center gap-2 active:scale-95">
            <span>📝</span> Exportar TXT
          </button>
          <button type="button" onClick={handleExportGeographicPDF} disabled={isGeneratingGeoReport} className={`px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-emerald-100 flex items-center gap-2 ${isGeneratingGeoReport ? 'opacity-50 cursor-wait' : 'hover:bg-emerald-700 active:scale-95'}`}>
            {isGeneratingGeoReport ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <span>📍</span>} Relatório Geográfico
          </button>
          <button type="button" onClick={handleExportSummaryPDF} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2">
            <span>📊</span> Exportar PDF Geral
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Parceiro Imobiliário</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Gestores (Parceria / Hub)</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Comissão</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right no-print">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {companies.map(company => (
              <tr key={company.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-semibold text-slate-800 text-sm">{company.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{company.cnpj}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs font-medium text-slate-700">P: {company.partnershipManager || 'N/D'}</p>
                  <p className="text-[10px] text-blue-500 italic">H: {company.hiringManager}</p>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${company.status === 'Ativo' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${company.status === 'Ativo' ? 'bg-green-600' : 'bg-slate-400'}`}></span>
                    {company.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-center font-bold text-emerald-600">{company.commissionRate}%</td>
                <td className="px-6 py-4 text-right no-print">
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => onView(company)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Ver Prontuário">👁️</button>
                    <button type="button" onClick={() => onEdit(company)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Editar">✏️</button>
                    <button type="button" onClick={() => onDelete(company.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Excluir do Sistema">🗑️</button>
                    <div className="w-[1px] h-8 bg-slate-100 mx-1"></div>
                    <button type="button" onClick={() => handleExportCompanyPDF(company)} className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-colors text-xs font-bold border border-blue-100">
                      <span>📥</span> PDF
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
