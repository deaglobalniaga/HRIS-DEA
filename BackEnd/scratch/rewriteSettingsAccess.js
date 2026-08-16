const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', '..', 'FrontEnd', 'src', 'pages', 'Settings.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

// Add states for employees and toggle logic
if (!content.includes('const [employeeAccessList, setEmployeeAccessList] = useState')) {
    content = content.replace(
        'const [companySettings, setCompanySettings] = useState({',
        `const [employeeAccessList, setEmployeeAccessList] = useState([]);
    const [fetchingAccess, setFetchingAccess] = useState(false);

    useEffect(() => {
        if (activeTab === 'access' && user?.role === 'superadmin') {
            fetchAccessList();
        }
    }, [activeTab]);

    const fetchAccessList = async () => {
        setFetchingAccess(true);
        try {
            const res = await api.get('/hris/employees');
            setEmployeeAccessList(res.data);
        } catch(e) { console.error('Failed to fetch employees for access settings', e); }
        setFetchingAccess(false);
    };

    const toggleAccess = async (empId, type) => {
        const emp = employeeAccessList.find(e => e.id === empId);
        if (!emp) return;
        const currentAccess = emp.attendance_access || { camera: true, gps: true };
        const newAccess = { ...currentAccess, [type]: !currentAccess[type] };
        
        try {
            await api.put(\`/hris/employees/\${empId}\`, { attendance_access: newAccess });
            setEmployeeAccessList(prev => prev.map(e => e.id === empId ? { ...e, attendance_access: newAccess } : e));
        } catch(e) {
            alert('Gagal mengubah hak akses');
        }
    };

    const [companySettings, setCompanySettings] = useState({`
    );
}

// Add isSuperAdmin variable
if (!content.includes('const isSuperAdmin = user?.role === \'superadmin\'')) {
    content = content.replace(
        'const isAdmin = user?.role?.toLowerCase().includes(\'admin\') || user?.role?.toLowerCase().includes(\'hr\');',
        `const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.role?.toLowerCase().includes('hr');
    const isSuperAdmin = user?.role === 'superadmin';`
    );
}

// Add Tab Button
if (!content.includes('setActiveTab(\'access\')')) {
    content = content.replace(
        /<\/nav>/,
        `
                        {isSuperAdmin && (
                            <button 
                                onClick={() => setActiveTab('access')}
                                className={\`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-sm transition-all \${activeTab === 'access' ? 'bg-white shadow-sm border border-slate-200 text-red-900' : 'text-slate-500 hover:bg-slate-100 hover:text-gray-900'}\`}
                            >
                                <Lock size={16} />
                                Hak Akses Presensi
                            </button>
                        )}
                    </nav>`
    );
}

// Add Tab Content
if (!content.includes('activeTab === \'access\'')) {
    const accessTab = `
                    {activeTab === 'access' && isSuperAdmin && (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-black text-gray-900">Hak Akses Presensi</h3>
                                    <p className="text-sm font-medium text-slate-500 mt-1">Atur fitur presensi mana yang dapat digunakan oleh masing-masing karyawan.</p>
                                </div>
                            </div>
                            
                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                {fetchingAccess ? (
                                    <div className="p-8 text-center font-bold text-slate-500">Memuat data karyawan...</div>
                                ) : (
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase">Nama Karyawan</th>
                                                <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase">Divisi</th>
                                                <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase text-center">Akses Kamera</th>
                                                <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase text-center">Akses GPS</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {employeeAccessList.map(emp => {
                                                const access = emp.attendance_access || { camera: true, gps: true };
                                                return (
                                                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-4 py-3 font-bold text-slate-800">{emp.nama}</td>
                                                        <td className="px-4 py-3 text-sm font-bold text-slate-500">{emp.department || '-'}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            <button 
                                                                onClick={() => toggleAccess(emp.id, 'camera')}
                                                                className={\`relative inline-flex h-6 w-11 items-center rounded-full transition-colors \${access.camera !== false ? 'bg-green-500' : 'bg-slate-300'}\`}
                                                            >
                                                                <span className={\`inline-block h-4 w-4 transform rounded-full bg-white transition-transform \${access.camera !== false ? 'translate-x-6' : 'translate-x-1'}\`} />
                                                            </button>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <button 
                                                                onClick={() => toggleAccess(emp.id, 'gps')}
                                                                className={\`relative inline-flex h-6 w-11 items-center rounded-full transition-colors \${access.gps !== false ? 'bg-green-500' : 'bg-slate-300'}\`}
                                                            >
                                                                <span className={\`inline-block h-4 w-4 transform rounded-full bg-white transition-transform \${access.gps !== false ? 'translate-x-6' : 'translate-x-1'}\`} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}
    `;
    
    content = content.replace(
        '</div>\n            </div>\n        </div>\n    );\n};\n\nexport default Settings;',
        accessTab + '\n                </div>\n            </div>\n        </div>\n    );\n};\n\nexport default Settings;'
    );
}

fs.writeFileSync(targetFile, content);
console.log('Settings.jsx updated successfully for Access Tab.');
