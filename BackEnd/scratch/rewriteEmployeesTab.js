const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', '..', 'FrontEnd', 'src', 'pages', 'Employees.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Add states
if (!content.includes('const [activeTab, setActiveTab] = useState')) {
    content = content.replace(
        'const [itemsPerPage, setItemsPerPage] = useState(10);',
        `const [itemsPerPage, setItemsPerPage] = useState(10);\n    const [activeTab, setActiveTab] = useState('all');\n    const [selectedHSEEmployee, setSelectedHSEEmployee] = useState(null);`
    );
}

// 2. Modify filter logic
content = content.replace(
    /const filteredEmployees = employees\.filter\(emp =>\s*\(\s*emp\.nama && emp\.nama\.toLowerCase\(\)\.includes\(searchTerm\.toLowerCase\(\)\)\s*\)\s*\|\|\s*\(\s*emp\.role && emp\.role\.toLowerCase\(\)\.includes\(searchTerm\.toLowerCase\(\)\)\s*\)\s*\|\|\s*\(\s*emp\.department && emp\.department\.toLowerCase\(\)\.includes\(searchTerm\.toLowerCase\(\)\)\s*\)\s*\);/,
    `const filteredEmployees = employees.filter(emp => {
        const matchesSearch = (emp.nama && emp.nama.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (emp.role && emp.role.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (emp.department && emp.department.toLowerCase().includes(searchTerm.toLowerCase()));
        
        if (activeTab === 'hse') {
            const isHSE = (emp.role && emp.role.toLowerCase() === 'hse') || (emp.certifications && emp.certifications.length > 0);
            return matchesSearch && isHSE;
        }
        return matchesSearch;
    });`
);

// 3. Add Tabs UI and HSE Popup
if (!content.includes('activeTab === \'all\'')) {
    const tabsUI = `
            <div className="flex items-center gap-4 border-b border-slate-200 mb-2">
                <button 
                    onClick={() => setActiveTab('all')} 
                    className={\`py-3 px-4 font-bold text-sm border-b-2 transition-colors \${activeTab === 'all' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'}\`}>
                    Semua Karyawan
                </button>
                <button 
                    onClick={() => setActiveTab('hse')} 
                    className={\`py-3 px-4 font-bold text-sm border-b-2 transition-colors \${activeTab === 'hse' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'}\`}>
                    Sertifikasi (HSE)
                </button>
            </div>
            `;
            
    content = content.replace(
        '<div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">',
        tabsUI + '\n            <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">'
    );
}

// 4. Add onClick to rows for HSE tab
if (!content.includes('onClick={() => activeTab === \'hse\'')) {
    content = content.replace(
        '<tr key={emp.id} className="group hover:bg-slate-50 transition-colors">',
        '<tr key={emp.id} onClick={() => activeTab === \'hse\' ? setSelectedHSEEmployee(emp) : null} className={`group hover:bg-slate-50 transition-colors ${activeTab === \'hse\' ? \'cursor-pointer\' : \'\'}`}>'
    );
}

// 5. Add Slide Over Panel for HSE
if (!content.includes('selectedHSEEmployee && (')) {
    const slideOver = `
            {selectedHSEEmployee && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedHSEEmployee(null)}></div>
                    <div className="w-full max-w-md bg-white h-full shadow-2xl relative z-10 flex flex-col transform transition-transform">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h2 className="text-lg font-black text-slate-800">Profil & Sertifikasi</h2>
                            <button onClick={() => setSelectedHSEEmployee(null)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"><X size={20} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xl text-slate-500">
                                    {(selectedHSEEmployee.nama || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-black text-lg text-slate-800">{selectedHSEEmployee.nama}</h3>
                                    <p className="font-bold text-sm text-slate-500">{selectedHSEEmployee.role}</p>
                                    <p className="font-bold text-xs text-slate-400">{selectedHSEEmployee.department || '-'}</p>
                                </div>
                            </div>
                            
                            <div>
                                <h4 className="font-black text-slate-800 mb-3 border-b pb-2">Daftar Sertifikasi</h4>
                                {!selectedHSEEmployee.certifications || selectedHSEEmployee.certifications.length === 0 ? (
                                    <p className="text-sm font-bold text-slate-500">Belum ada sertifikasi.</p>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {selectedHSEEmployee.certifications.map((cert, idx) => (
                                            <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                                                <h5 className="font-black text-sm text-slate-700">{cert.name}</h5>
                                                {cert.issue_date && <p className="text-xs font-bold text-slate-500 mt-1">Diterbitkan: {new Date(cert.issue_date).toLocaleDateString('id-ID')}</p>}
                                                {cert.document_url && (
                                                    <a href={\`http://localhost:5000\${cert.document_url}\`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors">
                                                        Lihat Dokumen
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
    `;
    
    // Add it right before the last closing div of return
    const lastClosingDiv = '</div>\n    );\n};';
    content = content.replace(lastClosingDiv, slideOver + '\n' + lastClosingDiv);
}

fs.writeFileSync(targetFile, content);
console.log('Employees.jsx updated successfully for HSE Tab.');
