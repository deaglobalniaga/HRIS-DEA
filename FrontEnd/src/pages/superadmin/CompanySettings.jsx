import React, { useState, useEffect } from 'react';
import {
  Building2, MapPin, Clock, ShieldCheck, Smartphone, Plus, Trash2,
  CheckCircle2, XCircle, RefreshCw, Save, Globe, Phone, Mail, FileText,
  Layers, Users, ShieldAlert, Wifi, Server, Search, Crosshair, Eye, EyeOff, Layers2, Edit, Check,
  Key, Lock, Timer, Sliders, Sparkles, ChevronLeft, ChevronRight
} from 'lucide-react';
import api from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

// Import Leaflet CSS & Components
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';

// Fix Leaflet default icon issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Red Geofence Pin Icon
const pinIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map clicks & pin dragging
function LocationMarker({ position, radius, onLocationChange }) {
  useMapEvents({
    click(e) {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return position ? (
    <>
      <Marker
        position={position}
        icon={pinIcon}
        draggable={true}
        eventHandlers={{
          dragend(e) {
            const marker = e.target;
            const newPos = marker.getLatLng();
            onLocationChange(newPos.lat, newPos.lng);
          },
        }}
      />
      <Circle
        center={position}
        radius={Number(radius) || 50}
        pathOptions={{
          color: '#dc2626',
          fillColor: '#ef4444',
          fillOpacity: 0.25,
          weight: 2,
          dashArray: '4, 6'
        }}
      />
    </>
  ) : null;
}

// Helper to recenter map view
function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, 16, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
}

const CompanySettings = () => {
  const { addToast } = useToast();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'super_admin';

  const [activeTab, setActiveTab] = useState('geofencing');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Map Tile Mode: 'google_hybrid' | 'google_roadmap' | 'osm'
  const [mapLayer, setMapLayer] = useState('google_hybrid');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  // Selected Location for Map Editing
  const [selectedLocIndex, setSelectedLocIndex] = useState(0);

  // Settings State
  const [showJwtSecret, setShowJwtSecret] = useState(false);
  const [settings, setSettings] = useState({
    company_name: 'PT DEA GLOBAL NIAGA',
    brand_name: 'DEA Global Niaga',
    company_email: 'dea.global.niaga1@gmail.com',
    company_phone: '0812-3456-7890',
    company_address: 'Banjarbaru, Kalimantan Selatan',
    npwp: '01.234.567.8-901.000',
    nib: '1234567890123',
    logo_url: '/dea.png',

    checkInStart: '06:00',
    checkInEnd: '09:00',
    checkOutStart: '17:00',
    checkOutEnd: '20:00',
    maxLateMinutes: 15,
    monthlyTargetHours: 160,

    officeLat: -3.42436,
    officeLng: 115.99267,
    officeRadius: 50,
    allowed_ips: '0.0.0.0/0',
    allowed_bssids: '',

    locations: [
      { id: 1, name: 'Head Office Banjarbaru', lat: -3.42436, lng: 115.99267, radius: 50 },
      { id: 2, name: 'Project Site Batulicin', lat: -3.45678, lng: 116.01234, radius: 200 }
    ],

    // Super Admin Security & JWT TTL
    jwt_secret: 'hris_dea_enterprise_secret_key_2026_super_secure',
    jwt_expiry_hours: 5,
    session_idle_timeout_minutes: 30,
    otp_validity_minutes: 10,
    otp_cooldown_minutes: 10,
    max_login_attempts: 15,
    mfa_enforced_for_superadmin: true
  });

  const [devices, setDevices] = useState([]);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState([]);
  const [deviceSearchTerm, setDeviceSearchTerm] = useState('');
  const [deviceCurrentPage, setDeviceCurrentPage] = useState(1);
  const deviceItemsPerPage = 8;
  const [newLoc, setNewLoc] = useState({ name: '', lat: -3.42436, lng: 115.99267, radius: 50 });

  const generateRandomJwtSecret = () => {
    const arr = new Uint8Array(32);
    window.crypto.getRandomValues(arr);
    const hex = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
    setSettings(prev => ({ ...prev, jwt_secret: `dgn_sec_${hex}` }));
    addToast('Kunci rahasia JWT baru (256-bit) berhasil dibuat!', 'info');
  };

  const fetchSettings = async () => {
    setFetching(true);
    try {
      const setRes = await api.get('/settings');
      if (setRes.data) {
        setSettings(prev => ({ ...prev, ...setRes.data }));
      }

      if (isSuperAdmin) {
        try {
          const devRes = await api.get('/settings/devices');
          setDevices(devRes.data || []);
        } catch (e) {
          console.error('Fetch devices error:', e);
        }
      }
    } catch (err) {
      console.error('Fetch settings error:', err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e?.preventDefault?.();
    setLoading(true);
    try {
      await api.patch('/settings', settings);
      addToast('Pengaturan perusahaan berhasil disimpan!', 'success');
    } catch (err) {
      addToast('Gagal menyimpan pengaturan: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Map Click Handler for active location
  const handleMapLocationChange = (lat, lng) => {
    const roundedLat = parseFloat(lat.toFixed(6));
    const roundedLng = parseFloat(lng.toFixed(6));

    if (settings.locations && settings.locations[selectedLocIndex]) {
      const updated = [...settings.locations];
      updated[selectedLocIndex] = {
        ...updated[selectedLocIndex],
        lat: roundedLat,
        lng: roundedLng
      };
      setSettings(prev => ({
        ...prev,
        locations: updated,
        officeLat: selectedLocIndex === 0 ? roundedLat : prev.officeLat,
        officeLng: selectedLocIndex === 0 ? roundedLng : prev.officeLng
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        officeLat: roundedLat,
        officeLng: roundedLng
      }));
    }
  };

  // Radius Slider Handler
  const handleRadiusChange = (newRadius) => {
    const rad = parseInt(newRadius) || 50;
    if (settings.locations && settings.locations[selectedLocIndex]) {
      const updated = [...settings.locations];
      updated[selectedLocIndex] = {
        ...updated[selectedLocIndex],
        radius: rad
      };
      setSettings(prev => ({
        ...prev,
        locations: updated,
        officeRadius: selectedLocIndex === 0 ? rad : prev.officeRadius
      }));
    } else {
      setSettings(prev => ({ ...prev, officeRadius: rad }));
    }
  };

  // Current GPS Location Handler
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      addToast('Browser tidak mendukung geolokasi GPS.', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        handleMapLocationChange(lat, lng);
        addToast(`Titik koordinat diperbarui dari GPS: [${lat}, ${lng}]`, 'success');
      },
      (err) => {
        addToast('Gagal mengambil titik GPS: ' + err.message, 'error');
      },
      { enableHighAccuracy: true }
    );
  };

  // Search Address Location using Nominatim
  const handleSearchLocation = async (e) => {
    e?.preventDefault?.();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(parseFloat(data[0].lat).toFixed(6));
        const lng = parseFloat(parseFloat(data[0].lon).toFixed(6));
        handleMapLocationChange(lat, lng);
        addToast(`Lokasi ditemukan: ${data[0].display_name.split(',')[0]}`, 'success');
      } else {
        addToast('Lokasi tidak ditemukan. Coba kata kunci lain.', 'error');
      }
    } catch (err) {
      addToast('Gagal mencari lokasi.', 'error');
    } finally {
      setSearching(false);
    }
  };

  const handleAddLocation = () => {
    if (!newLoc.name) {
      addToast('Harap isi nama site/lokasi.', 'error');
      return;
    }
    const updated = [
      ...(settings.locations || []),
      {
        id: Date.now(),
        name: newLoc.name,
        lat: parseFloat(newLoc.lat) || -3.42436,
        lng: parseFloat(newLoc.lng) || 115.99267,
        radius: parseInt(newLoc.radius) || 50
      }
    ];
    setSettings(prev => ({ ...prev, locations: updated }));
    setSelectedLocIndex(updated.length - 1);
    setNewLoc({ name: '', lat: -3.42436, lng: 115.99267, radius: 50 });
    addToast('Lokasi baru ditambahkan! Silakan klik pada peta untuk menyesuaikan titiknya.', 'success');
  };

  const handleDeleteLocation = (id, e) => {
    e.stopPropagation();
    if (settings.locations.length <= 1) {
      addToast('Minimal harus ada 1 titik lokasi aktif.', 'error');
      return;
    }
    const updated = (settings.locations || []).filter(l => l.id !== id);
    setSettings(prev => ({ ...prev, locations: updated }));
    setSelectedLocIndex(0);
    addToast('Lokasi dihapus.', 'info');
  };

  const handleDeviceStatus = async (id, is_trusted) => {
    try {
      await api.patch(`/settings/devices/${id}/status`, { is_trusted });
      addToast(`Status perangkat berhasil diubah menjadi ${is_trusted ? 'Dipercaya' : 'Dibatasi'}`, 'success');
      fetchSettings();
    } catch (err) {
      addToast('Gagal memperbarui status perangkat.', 'error');
    }
  };

  const handleDeleteDevice = async (id) => {
    if (!window.confirm('Hapus perangkat ini dari daftar whitelist?')) return;
    try {
      await api.delete(`/settings/devices/${id}`);
      addToast('Perangkat berhasil dihapus.', 'info');
      setSelectedDeviceIds(prev => prev.filter(item => item !== id));
      fetchSettings();
    } catch (err) {
      addToast('Gagal menghapus perangkat.', 'error');
    }
  };

  const toggleSelectAllDevices = () => {
    if (selectedDeviceIds.length === devices.length && devices.length > 0) {
      setSelectedDeviceIds([]);
    } else {
      setSelectedDeviceIds(devices.map(d => d.id));
    }
  };

  const toggleSelectDevice = (id) => {
    setSelectedDeviceIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteDevices = async () => {
    if (selectedDeviceIds.length === 0) return;
    if (!window.confirm(`Hapus ${selectedDeviceIds.length} perangkat terpilih dari daftar whitelist?`)) return;

    try {
      await api.post('/settings/devices/bulk-delete', { ids: selectedDeviceIds });
      addToast(`Berhasil menghapus ${selectedDeviceIds.length} perangkat dari whitelist.`, 'success');
      setSelectedDeviceIds([]);
      fetchSettings();
    } catch (err) {
      addToast('Gagal menghapus perangkat terpilih.', 'error');
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-xs font-bold text-slate-400">
        <RefreshCw className="animate-spin text-red-700 mr-2" size={20} /> Memuat data pengaturan sistem...
      </div>
    );
  }

  // Active Location Coordinates
  const activeLocation = settings.locations?.[selectedLocIndex] || {
    name: 'Head Office',
    lat: settings.officeLat || -3.42436,
    lng: settings.officeLng || 115.99267,
    radius: settings.officeRadius || 50
  };

  const mapCenter = [activeLocation.lat, activeLocation.lng];

  return (
    <div className="w-full bg-white/80 backdrop-blur-2xl rounded-[32px] shadow-xl shadow-slate-200/50 border border-white/80 ring-1 ring-slate-900/5 overflow-hidden font-sans">
      {/* Top Tabs Navigation */}
      <div className="border-b border-slate-200/60 p-4 bg-white/40 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveTab('geofencing')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'geofencing'
                ? 'bg-gradient-to-r from-red-700 to-rose-700 text-white shadow-md shadow-red-900/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <MapPin size={15} /> Peta Lokasi & Geofencing
          </button>
          <button
            onClick={() => setActiveTab('identity')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'identity'
                ? 'bg-gradient-to-r from-red-700 to-rose-700 text-white shadow-md shadow-red-900/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Building2 size={15} /> Identitas & Kontak
          </button>
          <button
            onClick={() => setActiveTab('attendance_policy')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'attendance_policy'
                ? 'bg-gradient-to-r from-red-700 to-rose-700 text-white shadow-md shadow-red-900/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Clock size={15} /> Kebijakan Jam Kerja
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('jwt_security')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'jwt_security'
                  ? 'bg-gradient-to-r from-red-700 to-rose-700 text-white shadow-md shadow-red-900/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Key size={15} /> Keamanan JWT & TTL Sesi
            </button>
          )}
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('device_whitelist')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'device_whitelist'
                  ? 'bg-gradient-to-r from-red-700 to-rose-700 text-white shadow-md shadow-red-900/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Smartphone size={15} /> Whitelist Perangkat
            </button>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="px-5 py-2 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md shadow-red-900/20 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Save size={15} /> {loading ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>
      </div>

      <div className="p-6">
        {/* VISUAL INTERACTIVE GEOFENCING */}
        {activeTab === 'geofencing' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <MapPin className="text-red-700" size={18} /> Peta Geofencing Visual & Multi-Lokasi
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Klik langsung pada peta untuk menentukan titik koordinat, drag pin merah, dan atur toleransi radius lingkaran presensi.
                </p>
              </div>

              {/* Map Layer Switcher */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMapLayer('google_hybrid')}
                  className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all flex items-center gap-1 ${
                    mapLayer === 'google_hybrid' ? 'bg-red-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye size={12} /> Google Satelit
                </button>
                <button
                  type="button"
                  onClick={() => setMapLayer('google_roadmap')}
                  className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all flex items-center gap-1 ${
                    mapLayer === 'google_roadmap' ? 'bg-red-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers2 size={12} /> Google Peta
                </button>
                <button
                  type="button"
                  onClick={() => setMapLayer('osm')}
                  className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${
                    mapLayer === 'osm' ? 'bg-red-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  OpenStreetMap
                </button>
              </div>
            </div>

            {/* Main Interactive Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Controls */}
              <div className="lg:col-span-4 space-y-4">
                {/* Search Address Bar */}
                <form onSubmit={handleSearchLocation} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari kota, jalan, atau site..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-900/20 font-medium"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={searching}
                    className="px-3 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all shrink-0"
                  >
                    {searching ? '...' : 'Cari'}
                  </button>
                </form>

                {/* Locations List */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                      Daftar Lokasi Terdaftar ({settings.locations?.length || 1})
                    </span>
                  </div>

                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {(settings.locations || []).map((loc, idx) => {
                      const isSelected = selectedLocIndex === idx;
                      return (
                        <div
                          key={loc.id || idx}
                          onClick={() => setSelectedLocIndex(idx)}
                          className={`p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-red-50/80 border-red-300 text-red-950 shadow-sm ring-1 ring-red-500/20'
                              : 'bg-white border-slate-200 hover:bg-slate-100/80 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-red-700 text-white' : 'bg-slate-100 text-slate-500'
                            }`}>
                              <MapPin size={15} />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold truncate">{loc.name}</h4>
                              <p className="text-[10px] text-slate-400 font-mono">
                                {loc.lat}, {loc.lng} • <span className="font-bold text-red-700">{loc.radius}m</span>
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteLocation(loc.id, e)}
                            className="text-slate-300 hover:text-red-600 p-1 transition-colors"
                            title="Hapus lokasi"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Active Location Coordinates & Radius Slider */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-900">
                      Edit Titik: <span className="text-red-700">{activeLocation.name}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={handleGetCurrentLocation}
                      className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[10px] font-black transition-all flex items-center gap-1"
                      title="Ambil lokasi GPS perangkat saat ini"
                    >
                      <Crosshair size={12} /> GPS Saya
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs font-medium">
                    <div>
                      <label className="block text-slate-500 text-[10px] font-bold mb-1">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        value={activeLocation.lat}
                        onChange={(e) => handleMapLocationChange(parseFloat(e.target.value) || 0, activeLocation.lng)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs outline-none focus:ring-1 focus:ring-red-900"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[10px] font-bold mb-1">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        value={activeLocation.lng}
                        onChange={(e) => handleMapLocationChange(activeLocation.lat, parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs outline-none focus:ring-1 focus:ring-red-900"
                      />
                    </div>
                  </div>

                  {/* Radius Slider */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Radius Toleransi Presensi
                      </span>
                      <span className="text-xs font-black text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                        {activeLocation.radius || 50} Meter
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="1000"
                      step="10"
                      value={activeLocation.radius || 50}
                      onChange={(e) => handleRadiusChange(e.target.value)}
                      className="w-full accent-red-700 cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-1">
                      <span>10m</span>
                      <span>100m</span>
                      <span>500m</span>
                      <span>1000m</span>
                    </div>
                  </div>
                </div>

                {/* Add Location Form */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1">
                    <Plus size={14} className="text-red-700" /> Tambah Lokasi / Site Baru
                  </h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nama Lokasi (misal: Site Asam Asam)"
                      value={newLoc.name}
                      onChange={(e) => setNewLoc({ ...newLoc, name: e.target.value })}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-900"
                    />
                    <button
                      type="button"
                      onClick={handleAddLocation}
                      className="px-4 py-1.5 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl transition-all shrink-0 shadow-sm"
                    >
                      Tambah
                    </button>
                  </div>
                </div>
              </div>

              {/* Map */}
              <div className="lg:col-span-8">
                <div className="w-full h-[480px] rounded-2xl border-2 border-slate-200 overflow-hidden shadow-inner relative z-10">
                  <MapContainer
                    center={mapCenter}
                    zoom={16}
                    scrollWheelZoom={true}
                    style={{ height: '100%', width: '100%' }}
                  >
                    {mapLayer === 'google_hybrid' && (
                      <TileLayer
                        attribution="&copy; Google Maps Satellite"
                        url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                        maxZoom={20}
                      />
                    )}
                    {mapLayer === 'google_roadmap' && (
                      <TileLayer
                        attribution="&copy; Google Maps"
                        url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                        maxZoom={20}
                      />
                    )}
                    {mapLayer === 'osm' && (
                      <TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                    )}

                    <MapRecenter center={mapCenter} />
                    <LocationMarker
                      position={mapCenter}
                      radius={activeLocation.radius || 50}
                      onLocationChange={handleMapLocationChange}
                    />
                  </MapContainer>

                  <div className="absolute top-3 left-3 z-[1000] bg-slate-900/85 backdrop-blur-md text-white px-3 py-1.5 rounded-xl shadow-lg border border-white/10 text-[11px] font-bold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                    <span>Klik pada peta atau geser pin merah untuk memindahkan titik</span>
                  </div>

                  <div className="absolute bottom-3 right-3 z-[1000] bg-white/90 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-200 text-[10px] font-mono font-bold text-slate-700 shadow-md">
                    Lat: {activeLocation.lat}, Lng: {activeLocation.lng} (Radius {activeLocation.radius}m)
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* IDENTITAS */}
        {activeTab === 'identity' && (
          <div className="space-y-6 max-w-3xl animate-in fade-in duration-200">
            <div>
              <h3 className="text-sm font-black text-slate-900">Identitas Legal & Profil Perusahaan</h3>
              <p className="text-xs text-slate-500 mt-0.5">Nama legal, brand resmi, nomor perizinan, dan kontak kantor pusat PT DEA GLOBAL NIAGA.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Nama Legal Perusahaan</label>
                <input
                  type="text"
                  value={settings.company_name}
                  onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-900/20 outline-none text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Brand Name / Nama Dagang</label>
                <input
                  type="text"
                  value={settings.brand_name}
                  onChange={(e) => setSettings({ ...settings, brand_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-900/20 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Nomor NPWP Perusahaan</label>
                <input
                  type="text"
                  value={settings.npwp}
                  onChange={(e) => setSettings({ ...settings, npwp: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-900/20 outline-none text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Nomor Induk Berusaha (NIB)</label>
                <input
                  type="text"
                  value={settings.nib}
                  onChange={(e) => setSettings({ ...settings, nib: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-900/20 outline-none text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Email Resmi HR / Perusahaan</label>
                <input
                  type="email"
                  value={settings.company_email}
                  onChange={(e) => setSettings({ ...settings, company_email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-900/20 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Nomor Telepon Kantor</label>
                <input
                  type="text"
                  value={settings.company_phone}
                  onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-900/20 outline-none text-xs"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">Alamat Kantor Pusat</label>
                <textarea
                  rows={2}
                  value={settings.company_address}
                  onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-900/20 outline-none text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* KEBIJAKAN JAM KERJA */}
        {activeTab === 'attendance_policy' && (
          <div className="space-y-6 max-w-3xl animate-in fade-in duration-200">
            <div>
              <h3 className="text-sm font-black text-slate-900">Kebijakan Jam Kerja & Presensi Operasional</h3>
              <p className="text-xs text-slate-500 mt-0.5">Waktu kedatangan, kepulangan, toleransi menit terlambat, dan target jam bulanan.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Jam Kedatangan (Mulai Absen Masuk)</label>
                <input
                  type="time"
                  value={settings.checkInStart}
                  onChange={(e) => setSettings({ ...settings, checkInStart: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-900/20 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Batas Jam Kedatangan (Tepat Waktu)</label>
                <input
                  type="time"
                  value={settings.checkInEnd}
                  onChange={(e) => setSettings({ ...settings, checkInEnd: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-900/20 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Jam Kepulangan (Mulai Absen Pulang)</label>
                <input
                  type="time"
                  value={settings.checkOutStart}
                  onChange={(e) => setSettings({ ...settings, checkOutStart: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-900/20 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Batas Jam Kepulangan (Selesai)</label>
                <input
                  type="time"
                  value={settings.checkOutEnd}
                  onChange={(e) => setSettings({ ...settings, checkOutEnd: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-900/20 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Batas Toleransi Keterlambatan (Menit)</label>
                <input
                  type="number"
                  value={settings.maxLateMinutes}
                  onChange={(e) => setSettings({ ...settings, maxLateMinutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-900/20 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Target Jam Kerja Bulanan</label>
                <input
                  type="number"
                  value={settings.monthlyTargetHours}
                  onChange={(e) => setSettings({ ...settings, monthlyTargetHours: parseInt(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-900/20 outline-none text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* WHITELIST PERANGKAT */}
        {activeTab === 'device_whitelist' && isSuperAdmin && (() => {
          const filteredDevices = devices.filter(d => {
            const term = deviceSearchTerm.toLowerCase();
            const username = (d.users?.username || '').toLowerCase();
            const role = (d.users?.roles?.name || '').toLowerCase();
            const devName = (d.device_name || '').toLowerCase();
            const ip = (d.ip_address || d.ip || '').toLowerCase();
            const fp = (d.device_fingerprint || '').toLowerCase();
            return username.includes(term) || role.includes(term) || devName.includes(term) || ip.includes(term) || fp.includes(term);
          });

          const totalDevicePages = Math.max(1, Math.ceil(filteredDevices.length / deviceItemsPerPage));
          const paginatedDevices = filteredDevices.slice((deviceCurrentPage - 1) * deviceItemsPerPage, deviceCurrentPage * deviceItemsPerPage);

          return (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Smartphone size={17} className="text-red-700" /> Whitelist Perangkat (Trusted Devices Control)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pengaturan status verifikasi device fingerprint dan kontrol approval login perangkat oleh Super Admin.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari user, IP, browser..."
                      value={deviceSearchTerm}
                      onChange={(e) => {
                        setDeviceSearchTerm(e.target.value);
                        setDeviceCurrentPage(1);
                      }}
                      className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-900/20 font-medium w-48 sm:w-60"
                    />
                  </div>

                  {selectedDeviceIds.length > 0 && (
                    <div className="flex items-center gap-2 animate-in fade-in">
                      <button
                        type="button"
                        onClick={handleBulkDeleteDevices}
                        className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white text-xs font-black rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 size={13} /> Hapus ({selectedDeviceIds.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDeviceIds([])}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Scrollable Table Container */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                <div className="max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200 sticky top-0 z-10 backdrop-blur-md">
                      <tr>
                        <th className="p-3.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={paginatedDevices.length > 0 && paginatedDevices.every(d => selectedDeviceIds.includes(d.id))}
                            onChange={() => {
                              const paginatedIds = paginatedDevices.map(d => d.id);
                              const allSelected = paginatedIds.every(id => selectedDeviceIds.includes(id));
                              if (allSelected) {
                                setSelectedDeviceIds(prev => prev.filter(id => !paginatedIds.includes(id)));
                              } else {
                                setSelectedDeviceIds(prev => Array.from(new Set([...prev, ...paginatedIds])));
                              }
                            }}
                            className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500 cursor-pointer accent-red-700"
                            title="Pilih perangkat pada halaman ini"
                          />
                        </th>
                        <th className="p-3.5">Pengguna</th>
                        <th className="p-3.5">Nama Perangkat & OS</th>
                        <th className="p-3.5">IP Address & Lokasi</th>
                        <th className="p-3.5">Waktu Login Terakhir</th>
                        <th className="p-3.5">Fingerprint Hash</th>
                        <th className="p-3.5">Status Whitelist</th>
                        <th className="p-3.5 text-right">Aksi Superadmin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredDevices.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-xs text-slate-400">
                            {deviceSearchTerm ? 'Tidak ada perangkat yang cocok dengan kata kunci pencarian.' : 'Belum ada perangkat terdaftar.'}
                          </td>
                        </tr>
                      ) : (
                        paginatedDevices.map((d) => {
                          const isSelected = selectedDeviceIds.includes(d.id);
                          const rawIp = d.ip || d.ip_address || '127.0.0.1';
                          const cleanIp = (rawIp === '::1' || rawIp === '127.0.0.1') ? '127.0.0.1 (Localhost)' : rawIp.replace('::ffff:', '');
                          const formattedLogin = d.last_login
                            ? new Date(d.last_login).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              }) + ' WITA'
                            : '-';

                          return (
                            <tr key={d.id} className={`transition-colors ${isSelected ? 'bg-red-50/40' : 'hover:bg-slate-50/50'}`}>
                              <td className="p-3.5 w-10 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectDevice(d.id)}
                                  className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500 cursor-pointer accent-red-700"
                                />
                              </td>
                              <td className="p-3.5 font-bold text-slate-900">
                                {d.users?.username || 'User'}
                                <span className="block text-[10px] text-slate-400 font-normal">{d.users?.roles?.name || 'user'}</span>
                              </td>
                              <td className="p-3.5">
                                <span className="font-bold text-slate-800">{d.device_name || 'Browser'}</span>
                                <span className="block text-[10px] text-slate-500">{d.browser || 'Chrome'} ({d.os || 'Windows'})</span>
                              </td>
                              <td className="p-3.5">
                                <span className="font-mono text-[11px] font-bold text-slate-800 block">{cleanIp}</span>
                                <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                                  <MapPin size={10} className="text-red-500" /> {d.location || 'Kalimantan Selatan, ID'}
                                </span>
                              </td>
                              <td className="p-3.5 text-[11px] text-slate-700">
                                <span className="font-medium block">{formattedLogin}</span>
                                {d.is_active && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Sesi Aktif
                                  </span>
                                )}
                              </td>
                              <td className="p-3.5 font-mono text-[10px] text-slate-400 truncate max-w-[100px]" title={d.device_fingerprint}>
                                {d.device_fingerprint || 'fp_default_hash'}
                              </td>
                              <td className="p-3.5">
                                {d.is_trusted ? (
                                  <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                    <CheckCircle2 size={12} /> Approved
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                    <ShieldAlert size={12} /> Pending Approval
                                  </span>
                                )}
                              </td>
                              <td className="p-3.5 text-right space-x-1.5">
                                {d.is_trusted ? (
                                  <button
                                    type="button"
                                    onClick={() => handleDeviceStatus(d.id, false)}
                                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                                  >
                                    Batasi
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleDeviceStatus(d.id, true)}
                                    className="px-2.5 py-1 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDevice(d.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
                                  title="Hapus perangkat"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {filteredDevices.length > 0 && (
                  <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <span>Menampilkan <strong>{Math.min((deviceCurrentPage - 1) * deviceItemsPerPage + 1, filteredDevices.length)}</strong> - <strong>{Math.min(deviceCurrentPage * deviceItemsPerPage, filteredDevices.length)}</strong> dari <strong>{filteredDevices.length}</strong> perangkat</span>
                    </div>

                    <div className="flex items-center gap-1.5 self-center">
                      <button
                        type="button"
                        disabled={deviceCurrentPage === 1}
                        onClick={() => setDeviceCurrentPage(prev => Math.max(1, prev - 1))}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        title="Halaman sebelumnya"
                      >
                        <ChevronLeft size={15} />
                      </button>

                      <div className="flex items-center gap-1 px-2 font-bold text-xs">
                        <span>Hal {deviceCurrentPage} dari {totalDevicePages}</span>
                      </div>

                      <button
                        type="button"
                        disabled={deviceCurrentPage >= totalDevicePages}
                        onClick={() => setDeviceCurrentPage(prev => Math.min(totalDevicePages, prev + 1))}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        title="Halaman berikutnya"
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* KEAMANAN JWT */}
        {activeTab === 'jwt_security' && isSuperAdmin && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Key className="text-red-700" size={18} /> Tata Kelola Kunci JWT & Batas Waktu Sesi (TTL)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Konfigurasi parameter enkripsi token otentikasi JWT, batas kadaluarsa sesi, waktu habis inaktivitas, dan kebijakan keamanan tingkat tinggi.
                </p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full shrink-0">
                Super Admin Only
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Kartu 1: JWT Secret & Expiry TTL */}
              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                    <Lock size={15} className="text-red-700" /> Kunci Rahasia JWT (Secret Key)
                  </h4>
                  <button
                    type="button"
                    onClick={generateRandomJwtSecret}
                    className="text-[10px] font-black text-red-700 hover:text-red-800 bg-red-100/60 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1"
                  >
                    <Sparkles size={12} /> Generate Acak (256-bit)
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    JWT Secret Key
                  </label>
                  <div className="relative">
                    <input
                      type={showJwtSecret ? 'text' : 'password'}
                      value={settings.jwt_secret || ''}
                      onChange={(e) => setSettings({ ...settings, jwt_secret: e.target.value })}
                      className="w-full pl-3 pr-10 py-2.5 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-800 outline-none"
                      placeholder="Masukkan secret key rahasia..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowJwtSecret(!showJwtSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showJwtSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Digunakan untuk menandatangani dan memverifikasi token JWT semua sesi login.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Masa Berlaku Token JWT (Access Token TTL)
                  </label>
                  
                  {/* Preset Dropdown */}
                  <select
                    value={
                      (settings.jwt_expiry_unit === 'minutes' || settings.jwt_expiry_unit === 'menit')
                        ? `m_${settings.jwt_expiry_value || Math.round((settings.jwt_expiry_hours || 5) * 60)}`
                        : (settings.jwt_expiry_unit === 'days' || settings.jwt_expiry_unit === 'hari')
                        ? `d_${settings.jwt_expiry_value || 1}`
                        : `h_${settings.jwt_expiry_value || settings.jwt_expiry_hours || 5}`
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.startsWith('m_')) {
                        const mins = Number(val.replace('m_', ''));
                        setSettings({
                          ...settings,
                          jwt_expiry_unit: 'minutes',
                          jwt_expiry_value: mins,
                          jwt_expiry_minutes: mins,
                          jwt_expiry_hours: mins / 60
                        });
                      } else if (val.startsWith('d_')) {
                        const days = Number(val.replace('d_', ''));
                        setSettings({
                          ...settings,
                          jwt_expiry_unit: 'days',
                          jwt_expiry_value: days,
                          jwt_expiry_hours: days * 24,
                          jwt_expiry_minutes: days * 24 * 60
                        });
                      } else if (val.startsWith('h_')) {
                        const hours = Number(val.replace('h_', ''));
                        setSettings({
                          ...settings,
                          jwt_expiry_unit: 'hours',
                          jwt_expiry_value: hours,
                          jwt_expiry_hours: hours,
                          jwt_expiry_minutes: hours * 60
                        });
                      }
                    }}
                    className="w-full p-2.5 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-800 outline-none"
                  >
                    <optgroup label="⏱️ Mode Pengujian Kilat (Menit)">
                      <option value="m_1">1 Menit (Testing Kilat)</option>
                      <option value="m_2">2 Menit (Testing Cepat)</option>
                      <option value="m_3">3 Menit (Testing)</option>
                      <option value="m_5">5 Menit (Testing Singkat)</option>
                      <option value="m_10">10 Menit (Testing Sesi)</option>
                      <option value="m_30">30 Menit (Short Session)</option>
                    </optgroup>
                    <optgroup label="🏢 Standar Operasional (Jam & Hari)">
                      <option value="h_1">1 Jam (Ultra-Strict Security)</option>
                      <option value="h_3">3 Jam (High-Security)</option>
                      <option value="h_5">5 Jam (Standar & Rekomendasi PT DGN)</option>
                      <option value="h_12">12 Jam (Shift Operasional)</option>
                      <option value="h_24">24 Jam (1 Hari Penuh)</option>
                      <option value="d_7">7 Hari (Extended Session)</option>
                    </optgroup>
                  </select>

                  {/* Custom Flexible Input (Menit / Jam / Hari) */}
                  <div className="mt-2.5 p-2.5 bg-white rounded-xl border border-slate-200/90 shadow-sm space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
                      Atur Durasi Bebas (Input Manual Kustom):
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={settings.jwt_expiry_value !== undefined ? settings.jwt_expiry_value : (settings.jwt_expiry_hours || 5)}
                        onChange={(e) => {
                          const val = Math.max(1, Number(e.target.value) || 1);
                          const unit = settings.jwt_expiry_unit || 'hours';
                          setSettings({
                            ...settings,
                            jwt_expiry_value: val,
                            jwt_expiry_unit: unit,
                            jwt_expiry_minutes: unit === 'minutes' ? val : (unit === 'days' ? val * 1440 : val * 60),
                            jwt_expiry_hours: unit === 'minutes' ? val / 60 : (unit === 'days' ? val * 24 : val)
                          });
                        }}
                        className="w-24 px-3 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-900/20 outline-none text-center"
                        placeholder="Contoh: 2"
                      />
                      <select
                        value={settings.jwt_expiry_unit || 'hours'}
                        onChange={(e) => {
                          const unit = e.target.value;
                          const val = Number(settings.jwt_expiry_value) || 1;
                          setSettings({
                            ...settings,
                            jwt_expiry_unit: unit,
                            jwt_expiry_value: val,
                            jwt_expiry_minutes: unit === 'minutes' ? val : (unit === 'days' ? val * 1440 : val * 60),
                            jwt_expiry_hours: unit === 'minutes' ? val / 60 : (unit === 'days' ? val * 24 : val)
                          });
                        }}
                        className="flex-1 px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg outline-none"
                      >
                        <option value="minutes">Menit (Minutes)</option>
                        <option value="hours">Jam (Hours)</option>
                        <option value="days">Hari (Days)</option>
                      </select>
                    </div>

                    {/* Active summary badge */}
                    <div className="flex items-center justify-between pt-1 text-[10px]">
                      <span className="text-slate-400">Total Durasi Kedaluwarsa:</span>
                      <span className="font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                        {settings.jwt_expiry_unit === 'minutes'
                          ? `${settings.jwt_expiry_value || 1} Menit (${(settings.jwt_expiry_value || 1) * 60} detik)`
                          : settings.jwt_expiry_unit === 'days'
                          ? `${settings.jwt_expiry_value || 1} Hari (${(settings.jwt_expiry_value || 1) * 24} jam)`
                          : `${settings.jwt_expiry_value || settings.jwt_expiry_hours || 5} Jam`}
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 mt-1">
                    Setelah durasi ini terlewati, sesi login berakhir dan pengguna wajib login kembali.
                  </p>
                </div>
              </div>

              {/* Kartu 2: Batas Waktu Sesi & Lockout */}
              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                  <Timer size={15} className="text-blue-700" /> Batas Waktu Inaktivitas & Lockout
                </h4>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Batas Waktu Sesi Inaktif (Inactivity Auto-Logout)
                  </label>
                  <select
                    value={settings.session_idle_timeout_minutes || 30}
                    onChange={(e) => setSettings({ ...settings, session_idle_timeout_minutes: Number(e.target.value) })}
                    className="w-full p-2.5 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-800 outline-none"
                  >
                    <option value={15}>15 Menit</option>
                    <option value={30}>30 Menit (Standar)</option>
                    <option value={60}>60 Menit (1 Jam)</option>
                    <option value={120}>120 Menit (2 Jam)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Sesi akan otomatis ditutup jika tidak ada aktivitas pengguna di browser.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Maksimal Percobaan Gagal Login (Rate Limiter Lockout)
                  </label>
                  <select
                    value={settings.max_login_attempts || 15}
                    onChange={(e) => setSettings({ ...settings, max_login_attempts: Number(e.target.value) })}
                    className="w-full p-2.5 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-800 outline-none"
                  >
                    <option value={5}>5 Kali Percobaan</option>
                    <option value={10}>10 Kali Percobaan</option>
                    <option value={15}>15 Kali Percobaan (Standar)</option>
                    <option value={30}>30 Kali Percobaan</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Melindungi sistem dari serangan Brute-Force & Credential Stuffing.
                  </p>
                </div>
              </div>

              {/* Kartu 3: Keamanan OTP */}
              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                  <ShieldCheck size={15} className="text-emerald-700" /> Proteksi Kode OTP Reset Password
                </h4>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Masa Berlaku Kode OTP Email (OTP Validity TTL)
                  </label>
                  <select
                    value={settings.otp_validity_minutes || 10}
                    onChange={(e) => setSettings({ ...settings, otp_validity_minutes: Number(e.target.value) })}
                    className="w-full p-2.5 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-800 outline-none"
                  >
                    <option value={5}>5 Menit</option>
                    <option value={10}>10 Menit (Standar & Rekomendasi)</option>
                    <option value={15}>15 Menit</option>
                    <option value={30}>30 Menit</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Batas waktu kedaluwarsa kode 6-digit yang dikirim ke email pemohon reset password.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Cooldown Kirim Ulang OTP (Anti-Database Fatigue)
                  </label>
                  <select
                    value={settings.otp_cooldown_minutes || 10}
                    onChange={(e) => setSettings({ ...settings, otp_cooldown_minutes: Number(e.target.value) })}
                    className="w-full p-2.5 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-800 outline-none"
                  >
                    <option value={5}>5 Menit</option>
                    <option value={10}>10 Menit (Standar)</option>
                    <option value={15}>15 Menit</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Menahan pengiriman ulang kode secara masif agar server dan database tidak kelelahan.
                  </p>
                </div>
              </div>

              {/* Kartu 4: Kebijakan MFA & Akses Kamera/GPS Global */}
              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-900 flex items-center gap-2 uppercase tracking-wider mb-2">
                    <ShieldAlert size={15} className="text-purple-700" /> Kebijakan Akses Kamera, GPS & MFA Global
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Atur kebijakan perangkat keras (hardware permissions) dan validasi presensi secara menyeluruh bagi seluruh personel perusahaan.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {/* Toggle 1: Face AI Camera */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Wajib Akses Kamera (Face AI Scanning)</span>
                      <span className="text-[10px] text-slate-400">Mengharuskan pemindaian wajah saat presensi</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.require_face_recognition !== false}
                      onChange={(e) => setSettings({ ...settings, require_face_recognition: e.target.checked })}
                      className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                    />
                  </div>

                  {/* Toggle 2: GPS Geofence */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Wajib Validasi GPS (Geofencing Compliance)</span>
                      <span className="text-[10px] text-slate-400">Mengharuskan lokasi GPS dalam radius site</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.require_gps_geofence !== false}
                      onChange={(e) => setSettings({ ...settings, require_gps_geofence: e.target.checked })}
                      className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                    />
                  </div>

                  {/* Toggle 3: MFA */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Wajibkan MFA Akun Administrator</span>
                      <span className="text-[10px] text-slate-400">Tingkatkan skor keamanan governance perusahaan</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.mfa_enforced_for_superadmin !== false}
                      onChange={(e) => setSettings({ ...settings, mfa_enforced_for_superadmin: e.target.checked })}
                      className="w-5 h-5 accent-red-700 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanySettings;
