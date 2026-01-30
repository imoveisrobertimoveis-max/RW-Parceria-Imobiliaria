
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Company } from '../types';

interface InteractiveMapProps {
  companies: Company[];
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({ companies }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [viewShared, setViewShared] = useState(false);
  const [viewReset, setViewReset] = useState(false);

  const MAP_VIEW_KEY = 'partner_hub_map_view_v2';
  const DEFAULT_CENTER: L.LatLngExpression = [-23.5505, -46.6333];
  const DEFAULT_ZOOM = 12;

  // Função para criar o ícone personalizado ultra-refinado
  const createCustomIcon = (company: Company) => {
    const isActive = company.status === 'Ativo';
    const color = isActive ? '#10b981' : '#94a3b8'; // Verde vivo vs Slate suave
    const shadowColor = isActive ? 'rgba(16, 185, 129, 0.4)' : 'rgba(148, 163, 184, 0.2)';
    
    return L.divIcon({
      className: 'custom-marker-wrapper',
      html: `
        <div class="relative flex items-center justify-center transition-all duration-300 group">
          <!-- Pulse Effect for Active Companies -->
          ${isActive ? `
            <div class="absolute w-12 h-12 rounded-full animate-ping opacity-25" style="background-color: ${color}"></div>
            <div class="absolute w-10 h-10 rounded-full animate-pulse opacity-10" style="background-color: ${color}"></div>
          ` : ''}
          
          <!-- Marker Body -->
          <div class="relative w-9 h-9 rounded-2xl border-[3px] border-white shadow-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-125 group-hover:-translate-y-2" 
               style="background-color: ${color}; box-shadow: 0 10px 20px ${shadowColor}">
            <span class="text-sm filter drop-shadow-md select-none">${isActive ? '🏢' : '💤'}</span>
          </div>
          
          <!-- Marker Tip -->
          <div class="absolute -bottom-1.5 w-3 h-3 bg-white rotate-45 rounded-sm border-r border-b border-slate-100 shadow-sm transition-transform duration-300 group-hover:translate-y-1"></div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -40]
    });
  };

  const handleShareView = () => {
    if (!mapRef.current) return;
    
    const center = mapRef.current.getCenter();
    const zoom = mapRef.current.getZoom();
    
    const viewState = {
      lat: center.lat,
      lng: center.lng,
      zoom: zoom
    };
    
    localStorage.setItem(MAP_VIEW_KEY, JSON.stringify(viewState));

    const url = new URL(window.location.href);
    url.searchParams.set('lat', center.lat.toFixed(6));
    url.searchParams.set('lng', center.lng.toFixed(6));
    url.searchParams.set('zoom', zoom.toString());
    
    navigator.clipboard.writeText(url.toString());
    
    setViewShared(true);
    setTimeout(() => setViewShared(false), 3000);
  };

  const handleClearSavedView = () => {
    localStorage.removeItem(MAP_VIEW_KEY);
    
    // Remove params da URL sem recarregar a página
    const url = new URL(window.location.href);
    url.searchParams.delete('lat');
    url.searchParams.delete('lng');
    url.searchParams.delete('zoom');
    window.history.replaceState({}, '', url.toString());

    if (mapRef.current) {
      if (companies.length > 0) {
        const markers = Array.from(markersRef.current.values());
        const group = L.featureGroup(markers);
        mapRef.current.fitBounds(group.getBounds().pad(0.2));
      } else {
        mapRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      }
    }

    setViewReset(true);
    setTimeout(() => setViewReset(false), 2000);
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    const savedViewStr = localStorage.getItem(MAP_VIEW_KEY);
    
    let initialCenter = DEFAULT_CENTER;
    let initialZoom = DEFAULT_ZOOM;

    const urlLat = urlParams.get('lat');
    const urlLng = urlParams.get('lng');
    const urlZoom = urlParams.get('zoom');

    if (urlLat && urlLng) {
      initialCenter = [parseFloat(urlLat), parseFloat(urlLng)];
      initialZoom = urlZoom ? parseInt(urlZoom) : 15;
    } else if (savedViewStr) {
      try {
        const savedView = JSON.parse(savedViewStr);
        initialCenter = [savedView.lat, savedView.lng];
        initialZoom = savedView.zoom;
      } catch (e) {
        console.error("Erro ao carregar visualização", e);
      }
    }

    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView(initialCenter, initialZoom);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20
    }).addTo(mapRef.current);

    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    const currentIds = new Set(companies.map(c => c.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    const markers: L.Marker[] = [];
    companies.forEach(company => {
      let marker = markersRef.current.get(company.id);
      const icon = createCustomIcon(company);

      if (marker) {
        marker.setLatLng([company.location.lat, company.location.lng]);
        marker.setIcon(icon);
      } else {
        marker = L.marker([company.location.lat, company.location.lng], { icon })
          .addTo(mapRef.current!)
          .bindPopup(`
            <div class="p-4 min-w-[240px] font-sans animate-slideUp">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl ${company.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}">
                  ${company.status === 'Ativo' ? '🏢' : '💤'}
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="font-black text-slate-900 m-0 leading-tight truncate">${company.name}</h4>
                  <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">${company.docType}: ${company.cnpj}</p>
                </div>
              </div>
              <p class="text-[10px] text-slate-500 mb-4 border-l-2 border-slate-100 pl-3 leading-relaxed">${company.address}</p>
              <div class="flex justify-between items-center pt-3 border-t border-slate-50">
                <span class="text-[9px] font-black uppercase tracking-widest ${company.status === 'Ativo' ? 'text-emerald-600' : 'text-slate-400'}">
                  ${company.status}
                </span>
                <div class="text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">
                  ${company.brokerCount} PROFISSIONAIS
                </div>
              </div>
            </div>
          `, { className: 'custom-leaflet-popup' });
        markersRef.current.set(company.id, marker);
      }
      markers.push(marker);
    });

    const hasViewConfig = localStorage.getItem(MAP_VIEW_KEY) || new URLSearchParams(window.location.search).has('lat');
    if (!hasViewConfig && markers.length > 0) {
      const group = L.featureGroup(markers);
      mapRef.current.fitBounds(group.getBounds().pad(0.2));
    }
  }, [companies]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim() || !mapRef.current) return;

    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        mapRef.current.setView([parseFloat(lat), parseFloat(lon)], 15);
      }
    } catch (error) {
      console.error("Erro na busca:", error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">
      {/* Search HUD */}
      <div className="absolute top-6 left-6 z-[1000] w-full max-w-sm pointer-events-none">
        <form onSubmit={handleSearch} className="pointer-events-auto flex gap-2">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Localizar região ou endereço..." 
              className="w-full h-12 pl-12 pr-4 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-2xl text-sm font-semibold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl opacity-40">📍</span>
          </div>
          <button 
            type="submit" 
            disabled={isSearching}
            className="h-12 px-6 bg-slate-900 text-white rounded-2xl font-bold shadow-lg hover:bg-black active:scale-95 transition-all disabled:opacity-50"
          >
            {isSearching ? '...' : 'Ir'}
          </button>
        </form>
      </div>

      {/* Map Actions Area */}
      <div className="absolute top-6 right-6 z-[1000] flex flex-col items-end gap-3">
        {/* Share View Action */}
        <button 
          onClick={handleShareView}
          className={`group flex items-center gap-3 px-6 py-3.5 rounded-2xl shadow-2xl border transition-all active:scale-95 ${viewShared ? 'bg-emerald-600 border-emerald-400 text-white animate-bounce' : 'bg-white border-slate-200 text-slate-700 hover:border-blue-500 hover:text-blue-600'}`}
        >
          <span className="text-xl">{viewShared ? '✅' : '🔗'}</span>
          <span className="text-xs font-black uppercase tracking-widest">
            {viewShared ? 'Link Copiado!' : 'Compartilhar Visualização'}
          </span>
        </button>

        {/* Clear/Reset View Action */}
        <button 
          onClick={handleClearSavedView}
          className={`group flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border transition-all active:scale-95 ${viewReset ? 'bg-amber-500 border-amber-400 text-white' : 'bg-white/80 backdrop-blur-sm border-slate-100 text-slate-500 hover:bg-white hover:text-amber-600 hover:border-amber-200'}`}
          title="Resetar visualização para o padrão"
        >
          <span className="text-lg">{viewReset ? '🔄' : '🗑️'}</span>
          <span className="text-[10px] font-black uppercase tracking-widest">
            {viewReset ? 'Visão Resetada' : 'Limpar Cache de Visão'}
          </span>
        </button>
      </div>

      {/* Legend & Stats Overlay */}
      <div className="absolute bottom-6 left-6 z-[1000] pointer-events-none">
        <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md p-5 rounded-[2.5rem] shadow-2xl border border-white/10 flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-lg bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse flex items-center justify-center text-[10px]">🏢</div>
            <div className="space-y-0.5">
              <span className="block text-[10px] font-black text-white uppercase tracking-wider">Parceiros Ativos</span>
              <span className="block text-[9px] text-emerald-400 font-bold">Pulso de operação</span>
            </div>
          </div>
          <div className="w-[1px] h-8 bg-white/10"></div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-lg bg-slate-500 ring-4 ring-slate-500/10 flex items-center justify-center text-[10px]">💤</div>
            <div className="space-y-0.5">
              <span className="block text-[10px] font-black text-white uppercase tracking-wider">Inativos</span>
              <span className="block text-[9px] text-slate-400 font-bold">Pausa comercial</span>
            </div>
          </div>
        </div>
      </div>

      <div ref={mapContainerRef} className="flex-1 w-full h-full" />
      
      <style>{`
        .custom-leaflet-popup .leaflet-popup-content-wrapper {
          border-radius: 1.75rem;
          padding: 0;
          overflow: hidden;
          box-shadow: 0 30px 60px -12px rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.8);
        }
        .custom-leaflet-popup .leaflet-popup-content {
          margin: 0;
        }
        .custom-leaflet-popup .leaflet-popup-tip {
          background: white;
          box-shadow: none;
        }
        .custom-marker-wrapper {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
};
