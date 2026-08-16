import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { useToast } from '../context/ToastContext';

const CompanySettings = () => {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [companySettings, setCompanySettings] = useState({
        monthlyTargetHours: 160,
        officeLat: -3.42436,
        officeLng: 115.99267,
        officeRadius: 50,
        checkInStart: '06:00',
        checkInEnd: '09:00',
        checkOutStart: '17:00',
        checkOutEnd: '20:00',
        maxLateMinutes: 15
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/settings');
                if (res.data) setCompanySettings(res.data);
            } catch (err) {
                console.error("Gagal memuat pengaturan perusahaan:", err);
            }
        };
        fetchSettings();
    }, []);

    const handleSaveCompanySettings = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.patch('/settings', companySettings);
            addToast('Pengaturan perusahaan berhasil disimpan!', 'success');
        } catch (error) {
            addToast('Gagal menyimpan pengaturan: ' + (error.response?.data?.error || error.message), 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6">
                <h3 className="text-base font-black text-gray-900 mb-6">Pengaturan Kebijakan Perusahaan</h3>
                <form onSubmit={handleSaveCompanySettings} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="group">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Target Jam Bulanan</label>
                            <input type="number" value={companySettings.monthlyTargetHours} onChange={(e) => setCompanySettings({...companySettings, monthlyTargetHours: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-2.5 outline-none focus:border-red-900" />
                        </div>
                        <div className="group">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Batas Telat (Menit)</label>
                            <input type="number" value={companySettings.maxLateMinutes} onChange={(e) => setCompanySettings({...companySettings, maxLateMinutes: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-2.5 outline-none focus:border-red-900" />
                        </div>
                        <div className="group">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Jam Kedatangan (Mulai)</label>
                            <input type="time" value={companySettings.checkInStart} onChange={(e) => setCompanySettings({...companySettings, checkInStart: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-2.5 outline-none focus:border-red-900" />
                        </div>
                        <div className="group">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Batas Jam Kedatangan (Selesai)</label>
                            <input type="time" value={companySettings.checkInEnd} onChange={(e) => setCompanySettings({...companySettings, checkInEnd: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-2.5 outline-none focus:border-red-900" />
                        </div>
                        <div className="group">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Jam Kepulangan (Mulai)</label>
                            <input type="time" value={companySettings.checkOutStart} onChange={(e) => setCompanySettings({...companySettings, checkOutStart: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-2.5 outline-none focus:border-red-900" />
                        </div>
                        <div className="group">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Batas Jam Kepulangan (Selesai)</label>
                            <input type="time" value={companySettings.checkOutEnd} onChange={(e) => setCompanySettings({...companySettings, checkOutEnd: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-2.5 outline-none focus:border-red-900" />
                        </div>
                        <div className="group">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Radius Absensi Kantor (Meter)</label>
                            <input type="number" value={companySettings.officeRadius} onChange={(e) => setCompanySettings({...companySettings, officeRadius: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-2.5 outline-none focus:border-red-900" />
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="submit" disabled={loading} className="px-6 py-2 bg-red-900 text-white font-bold rounded-xl hover:bg-red-800 transition">
                            {loading ? 'Menyimpan...' : 'Simpan Pengaturan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CompanySettings;
