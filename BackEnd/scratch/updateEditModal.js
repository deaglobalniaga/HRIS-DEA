const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', '..', 'FrontEnd', 'src', 'pages', 'Employees.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

const newEditModal = `            {showEditModal && selectedEmp && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-4xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-gray-900">Edit Data Karyawan</h2>
                                <p className="text-xs font-bold text-slate-400 mt-1">Lengkapi atau perbarui seluruh data karyawan.</p>
                            </div>
                            <button onClick={() => { setShowEditModal(false); setSelectedEmp(null); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-red-100 hover:text-red-900 transition">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <form id="edit-emp-form" onSubmit={handleEditEmployee} className="space-y-6">
                                {message && (
                                    <div className={\`p-4 text-sm font-bold rounded-xl flex items-center gap-3 \${message.includes('Gagal') ? 'bg-red-50 text-red-900 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}\`}>
                                        <AlertCircle size={18} /> {message}
                                    </div>
                                )}
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="md:col-span-2 lg:col-span-3 pb-2 border-b border-slate-100 mb-2">
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Data Pribadi</h3>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Nama Lengkap *</label>
                                        <input type="text" required value={selectedEmp.nama || ''} onChange={e => setSelectedEmp({ ...selectedEmp, nama: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Tempat Lahir</label>
                                        <input type="text" value={selectedEmp.tempat_lahir || ''} onChange={e => setSelectedEmp({ ...selectedEmp, tempat_lahir: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Tanggal Lahir</label>
                                        <input type="date" value={selectedEmp.tanggal_lahir ? new Date(selectedEmp.tanggal_lahir).toISOString().split('T')[0] : ''} onChange={e => setSelectedEmp({ ...selectedEmp, tanggal_lahir: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all" />
                                    </div>
                                    <div className="md:col-span-2 lg:col-span-3">
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Alamat</label>
                                        <textarea rows="2" value={selectedEmp.alamat || ''} onChange={e => setSelectedEmp({ ...selectedEmp, alamat: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all"></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">No Handphone</label>
                                        <input type="text" value={selectedEmp.no_handphone || ''} onChange={e => setSelectedEmp({ ...selectedEmp, no_handphone: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Agama</label>
                                        <input type="text" value={selectedEmp.agama || ''} onChange={e => setSelectedEmp({ ...selectedEmp, agama: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Status Perkawinan</label>
                                        <input type="text" value={selectedEmp.status_perkawinan || ''} onChange={e => setSelectedEmp({ ...selectedEmp, status_perkawinan: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Pendidikan</label>
                                        <input type="text" value={selectedEmp.pendidikan || ''} onChange={e => setSelectedEmp({ ...selectedEmp, pendidikan: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Jurusan</label>
                                        <input type="text" value={selectedEmp.jurusan || ''} onChange={e => setSelectedEmp({ ...selectedEmp, jurusan: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Kontak Darurat</label>
                                        <input type="text" value={selectedEmp.kontak_darurat || ''} onChange={e => setSelectedEmp({ ...selectedEmp, kontak_darurat: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Hubungan Kontak Darurat</label>
                                        <input type="text" value={selectedEmp.hubungan || ''} onChange={e => setSelectedEmp({ ...selectedEmp, hubungan: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all" />
                                    </div>

                                    <div className="md:col-span-2 lg:col-span-3 pb-2 border-b border-slate-100 mb-2 mt-4">
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Data Kepegawaian</h3>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Perusahaan</label>
                                        <input type="text" value={selectedEmp.perusahaan || ''} onChange={e => setSelectedEmp({ ...selectedEmp, perusahaan: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Penempatan</label>
                                        <input type="text" value={selectedEmp.penempatan || ''} onChange={e => setSelectedEmp({ ...selectedEmp, penempatan: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Department</label>
                                        <input type="text" value={selectedEmp.department || ''} onChange={e => setSelectedEmp({ ...selectedEmp, department: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Cost Center</label>
                                        <input type="text" value={selectedEmp.cost_center || ''} onChange={e => setSelectedEmp({ ...selectedEmp, cost_center: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Jabatan</label>
                                        <input type="text" value={selectedEmp.jabatan || ''} onChange={e => setSelectedEmp({ ...selectedEmp, jabatan: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Level</label>
                                        <input type="text" value={selectedEmp.level || ''} onChange={e => setSelectedEmp({ ...selectedEmp, level: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Status Karyawan</label>
                                        <input type="text" value={selectedEmp.status_karyawan || ''} onChange={e => setSelectedEmp({ ...selectedEmp, status_karyawan: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Nomor PKWT</label>
                                        <input type="text" value={selectedEmp.nomor_pkwt || ''} onChange={e => setSelectedEmp({ ...selectedEmp, nomor_pkwt: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">NIK</label>
                                        <input type="text" value={selectedEmp.nik || ''} onChange={e => setSelectedEmp({ ...selectedEmp, nik: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Nomor Pegawai</label>
                                        <input type="text" value={selectedEmp.nomor_pegawai || ''} onChange={e => setSelectedEmp({ ...selectedEmp, nomor_pegawai: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Join Date</label>
                                        <input type="date" value={selectedEmp.join_date ? new Date(selectedEmp.join_date).toISOString().split('T')[0] : ''} onChange={e => setSelectedEmp({ ...selectedEmp, join_date: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Efektif Resign</label>
                                        <input type="date" value={selectedEmp.efektif_resign ? new Date(selectedEmp.efektif_resign).toISOString().split('T')[0] : ''} onChange={e => setSelectedEmp({ ...selectedEmp, efektif_resign: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Email Pribadi</label>
                                        <input type="email" value={selectedEmp.email || ''} onChange={e => setSelectedEmp({ ...selectedEmp, email: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Email Office</label>
                                        <input type="email" value={selectedEmp.email_office || ''} onChange={e => setSelectedEmp({ ...selectedEmp, email_office: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all" />
                                    </div>
                                    
                                    {/* Hanya munculkan edit Role & Password bagi Super Admin */}
                                    {(user?.role === 'superadmin' || user?.role === 'admin') && (
                                        <>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Role Sistem</label>
                                                <select value={selectedEmp.role || 'user'} onChange={e => setSelectedEmp({ ...selectedEmp, role: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all">
                                                    <option value="user">User</option>
                                                    <option value="admin">Admin</option>
                                                    {user?.role === 'superadmin' && <option value="superadmin">Superadmin</option>}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2">Ubah Password Baru (Opsional)</label>
                                                <input type="text" value={selectedEmp.password || ''} onChange={e => setSelectedEmp({ ...selectedEmp, password: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all" placeholder="Kosongkan jika tidak diubah" />
                                            </div>
                                        </>
                                    )}

                                    <div className="md:col-span-2 lg:col-span-3 pb-2 border-b border-slate-100 mb-2 mt-4">
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Dokumen & Bank</h3>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Status Pajak</label>
                                        <input type="text" value={selectedEmp.status_pajak || ''} onChange={e => setSelectedEmp({ ...selectedEmp, status_pajak: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">NPWP</label>
                                        <input type="text" value={selectedEmp.npwp || ''} onChange={e => setSelectedEmp({ ...selectedEmp, npwp: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Nomor KPJ</label>
                                        <input type="text" value={selectedEmp.nomor_kpj || ''} onChange={e => setSelectedEmp({ ...selectedEmp, nomor_kpj: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Nomor JKN</label>
                                        <input type="text" value={selectedEmp.nomor_jkn || ''} onChange={e => setSelectedEmp({ ...selectedEmp, nomor_jkn: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Nama Rekening</label>
                                        <input type="text" value={selectedEmp.nama_rekening || ''} onChange={e => setSelectedEmp({ ...selectedEmp, nama_rekening: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">Nomor Rekening</label>
                                        <input type="text" value={selectedEmp.nomor_rekening || ''} onChange={e => setSelectedEmp({ ...selectedEmp, nomor_rekening: e.target.value })} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all" />
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                            <button type="button" onClick={() => { setShowEditModal(false); setSelectedEmp(null); }} className="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition">Batal</button>
                            <button type="submit" form="edit-emp-form" disabled={submitting} className="px-6 py-2 bg-red-900 text-white font-bold rounded-xl hover:bg-red-800 transition disabled:opacity-50">
                                {submitting ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}`;

const regex = /\{\s*showEditModal && selectedEmp && \([\s\S]*?\}\)\s*\}/;
content = content.replace(regex, newEditModal);

fs.writeFileSync(targetFile, content);
console.log('Employees.jsx Edit modal updated');
