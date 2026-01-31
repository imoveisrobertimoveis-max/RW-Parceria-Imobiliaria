
export interface ContactHistoryEntry {
  id: string;
  date: string;
  type: 'Telefone' | 'WhatsApp' | 'E-mail' | 'Reunião' | 'Vídeo' | 'Visita' | 'Evento' | 'Outros';
  summary: string;
  details?: string;
  nextContactDate?: string;
}

export interface Broker {
  id: string;
  name: string;
  creci: string;
  creciUF: string;
  email: string;
}

export interface Company {
  id: string;
  name: string; // Nome Fantasia ou Nome Curto
  razaoSocial?: string;
  cnpj: string; 
  creci?: string;
  creciUF?: string;
  docType: 'CNPJ' | 'CPF' | 'CRECI';
  cep: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  responsible: string;
  partnershipManager: string;
  hiringManager: string;
  website?: string;
  email: string;
  phone: string;
  registrationDate: string;
  brokerCount: number;
  commissionRate: number;
  status: 'Ativo' | 'Inativo';
  lastContactDate?: string;
  lastContactType?: string;
  contactSummary?: string;
  nextContactDate?: string;
  notes?: string;
  contactHistory: ContactHistoryEntry[];
  brokers: Broker[];
}

export interface DashboardStats {
  totalCompanies: number;
  totalBrokers: number;
  avgBrokers: number;
  activePercentage: number;
}
