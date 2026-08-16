const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', '..', 'FrontEnd', 'src', 'pages', 'Settings.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Add state for jwtSecret
if (!content.includes('const [jwtSecret, setJwtSecret] = useState')) {
    content = content.replace(
        'const [fetchingAccess, setFetchingAccess] = useState(false);',
        `const [fetchingAccess, setFetchingAccess] = useState(false);
    const [jwtSecret, setJwtSecret] = useState('****************');`
    );
}

// 2. Add fetch and regenerate functions
if (!content.includes('const fetchJwtSecret = async () => {')) {
    content = content.replace(
        'const fetchAccessList = async () => {',
        `const fetchJwtSecret = async () => {
        try {
            const res = await api.get('/auth/jwt-secret');
            setJwtSecret(res.data.secret);
        } catch (e) { console.error('Failed to fetch JWT Secret', e); }
    };

    const regenerateJwtSecret = async () => {
        if (!window.confirm('PERINGATAN: Mengubah Secret Key akan memaksa SEMUA user (termasuk Anda) keluar dari sesi login saat ini. Anda yakin?')) return;
        try {
            const res = await api.post('/auth/jwt-secret/regenerate');
            setJwtSecret(res.data.secret);
            addToast(res.data.message, 'success');
            setTimeout(() => {
                logout(); // force logout after changing secret
            }, 3000);
        } catch (e) {
            addToast('Gagal mengubah Secret Key', 'error');
        }
    };

    const fetchAccessList = async () => {`
    );
}

// 3. Add fetch call inside useEffect when activeTab === 'system'
content = content.replace(
    "if (activeTab === 'access' && user?.role === 'superadmin') {",
    `if (activeTab === 'system' && user?.role === 'superadmin') {
            fetchJwtSecret();
        }
        if (activeTab === 'access' && user?.role === 'superadmin') {`
);

// 4. Add System Tab Button
content = content.replace(
    "{user?.role === 'superadmin' && (",
    `{user?.role === 'superadmin' && (
                            <button
                                onClick={() => setActiveTab('system')}
                                className={\`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-sm transition-all \${activeTab === 'system' ? 'bg-white shadow-sm border border-slate-200 text-red-900' : 'text-slate-500 hover:bg-slate-100 hover:text-gray-900'}\`}>
                                <div className={\`p-2 rounded-lg \${activeTab === 'system' ? 'bg-red-50 text-red-600' : 'bg-slate-100'}\`}>
                                    <Key size={16} />
                                </div>
                                Konfigurasi Sistem
                            </button>
                        )}
                        {user?.role === 'superadmin' && (`
);

// 5. Add Key import
if (!content.includes('Key,')) {
    content = content.replace('MapPin, ShieldAlert', 'MapPin, ShieldAlert, Key');
}

// 6. Add System Tab Content
const systemTabContent = `
                    {activeTab === 'system' && user?.role === 'superadmin' && (
                        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 max-w-4xl animate-in fade-in slide-in-from-bottom-4">
                            <div className="flex items-center gap-4 border-b border-slate-100 pb-6 mb-8">
                                <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                                    <Key size={28} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800">Konfigurasi Sistem Utama</h2>
                                    <p className="text-sm font-bold text-slate-500 mt-1">Kelola *Secret Key* (JWT) dan pengaturan tingkat *root*.</p>
                                </div>
                            </div>
                            
                            <div className="space-y-8">
                                <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
                                    <div className="flex items-start gap-4">
                                        <ShieldAlert size={24} className="text-red-600 shrink-0 mt-1" />
                                        <div>
                                            <h3 className="text-lg font-black text-red-900">JSON Web Token (JWT) Secret</h3>
                                            <p className="text-sm font-medium text-red-700 mt-2 leading-relaxed">
                                                Secret Key digunakan untuk mengenkripsi dan menandatangani sesi *login* seluruh karyawan. Jika Anda merasa kunci saat ini telah bocor, Anda dapat meregenerasinya. 
                                                <br/><br/>
                                                <strong>PERINGATAN:</strong> Mengubah kunci ini akan langsung memutuskan semua sesi *login* yang sedang aktif (Force Logout) untuk seluruh pengguna aplikasi!
                                            </p>
                                            
                                            <div className="mt-6 flex flex-col sm:flex-row items-center gap-4">
                                                <div className="flex-1 w-full relative">
                                                    <input 
                                                        type="text" 
                                                        readOnly 
                                                        value={jwtSecret} 
                                                        className="w-full bg-white border border-red-200 text-red-900 font-mono text-sm rounded-xl px-4 py-3 outline-none" 
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-red-400 bg-red-50 px-2 rounded-md">READ ONLY</span>
                                                </div>
                                                <button 
                                                    onClick={regenerateJwtSecret}
                                                    className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition-all whitespace-nowrap">
                                                    <RefreshCw size={18} /> Regenerasi Key
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
`;

content = content.replace(
    "{activeTab === 'access' && user?.role === 'superadmin' && (",
    `${systemTabContent}\n                    {activeTab === 'access' && user?.role === 'superadmin' && (`
);

fs.writeFileSync(targetFile, content);
console.log('Settings.jsx updated with System Config Tab.');
