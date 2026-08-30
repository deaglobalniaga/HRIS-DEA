import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Upload, Download, FileSpreadsheet, Printer, CheckSquare, 
  Square, FileText, CheckCircle2, AlertCircle, RefreshCw, Layers, 
  Settings2, ArrowRight, ArrowLeft, Check, Sparkles, HelpCircle
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Comprehensive Employee Column Definitions
export const EMPLOYEE_COLUMNS = [
  { key: 'nomor_pegawai', label: 'NIP / ID Pegawai', category: 'Identitas Pokok', sample: 'EMP-001', required: true, getVal: emp => emp.nomor_pegawai || '-' },
  { key: 'nik', label: 'NIK (Nomor KTP)', category: 'Identitas Pokok', sample: '6301234567890001', required: true, getVal: emp => emp.nik || '-' },
  { key: 'nama_lengkap', label: 'Nama Lengkap', category: 'Identitas Pokok', sample: 'BUDI SANTOSO', required: true, getVal: emp => emp.nama_lengkap || emp.nama || '-' },
  { key: 'jenis_kelamin', label: 'Jenis Kelamin', category: 'Identitas Pokok', sample: 'Laki-laki', required: false, getVal: emp => emp.jenis_kelamin || '-' },
  { key: 'tempat_lahir', label: 'Tempat Lahir', category: 'Identitas Pokok', sample: 'Banjarmasin', required: false, getVal: emp => emp.tempat_lahir || '-' },
  { key: 'tanggal_lahir', label: 'Tanggal Lahir', category: 'Identitas Pokok', sample: '1992-05-15', required: false, getVal: emp => emp.tanggal_lahir ? emp.tanggal_lahir.split('T')[0] : '-' },
  { key: 'agama', label: 'Agama', category: 'Identitas Pokok', sample: 'Islam', required: false, getVal: emp => emp.agama || '-' },
  { key: 'alamat', label: 'Alamat Domisili', category: 'Identitas Pokok', sample: 'Jl. Ahmad Yani Km 5 No. 12', required: false, getVal: emp => emp.alamat || '-' },
  { key: 'no_handphone', label: 'No Handphone / WA', category: 'Identitas Pokok', sample: '081234567890', required: false, getVal: emp => emp.no_handphone || '-' },
  { key: 'email', label: 'Email Pribadi', category: 'Identitas Pokok', sample: 'budi@example.com', required: false, getVal: emp => emp.email || '-' },
  
  { key: 'email_office', label: 'Email Kantor', category: 'Pekerjaan & Kontrak', sample: 'budi@deaglobalniaga.com', required: false, getVal: emp => emp.email_office || '-' },
  { key: 'perusahaan', label: 'Perusahaan', category: 'Pekerjaan & Kontrak', sample: 'PT DEA GLOBAL NIAGA', required: false, getVal: emp => emp.perusahaan || 'PT DEA GLOBAL NIAGA' },
  { key: 'penempatan', label: 'Penempatan (Site BIB / HO)', category: 'Pekerjaan & Kontrak', sample: 'Site BIB', required: false, getVal: emp => emp.penempatan || 'Site BIB' },
  { key: 'department', label: 'Departemen', category: 'Pekerjaan & Kontrak', sample: 'Project BIB', required: true, getVal: emp => emp.department || emp.departments?.name || '-' },
  { key: 'cost_center', label: 'Cost Center', category: 'Pekerjaan & Kontrak', sample: 'SITE BIB', required: false, getVal: emp => emp.cost_center || 'SITE BIB' },
  { key: 'jabatan', label: 'Jabatan', category: 'Pekerjaan & Kontrak', sample: 'Project Engineer', required: true, getVal: emp => emp.jabatan || '-' },
  { key: 'level', label: 'Level Golongan', category: 'Pekerjaan & Kontrak', sample: 'LEVEL 6 (ENGINEER/TEKNISI)', required: false, getVal: emp => emp.level || '-' },
  { key: 'status_karyawan', label: 'Status Karyawan', category: 'Pekerjaan & Kontrak', sample: 'Aktif', required: false, getVal: emp => emp.status_karyawan || 'Aktif' },
  { key: 'roster_type', label: 'Tipe Roster (8/2 atau 6/2)', category: 'Pekerjaan & Kontrak', sample: '8/2', required: false, getVal: emp => emp.roster_type || '8/2' },
  { key: 'join_date', label: 'Tanggal Bergabung', category: 'Pekerjaan & Kontrak', sample: '2024-01-15', required: false, getVal: emp => emp.join_date ? emp.join_date.split('T')[0] : '-' },
  { key: 'nomor_pkwt', label: 'Nomor PKWT', category: 'Pekerjaan & Kontrak', sample: 'PKWT-001/DGN/2024', required: false, getVal: emp => emp.nomor_pkwt || '-' },

  { key: 'pendidikan', label: 'Pendidikan Terakhir', category: 'Pendidikan & Keluarga', sample: 'S1', required: false, getVal: emp => emp.pendidikan || '-' },
  { key: 'jurusan', label: 'Jurusan Pendidikan', category: 'Pendidikan & Keluarga', sample: 'Teknik Pertambangan', required: false, getVal: emp => emp.jurusan || '-' },
  { key: 'status_perkawinan', label: 'Status Perkawinan', category: 'Pendidikan & Keluarga', sample: 'Menikah', required: false, getVal: emp => emp.status_perkawinan || '-' },
  { key: 'kontak_darurat', label: 'Nama Kontak Darurat', category: 'Pendidikan & Keluarga', sample: 'Siti Rahma', required: false, getVal: emp => emp.kontak_darurat || '-' },
  { key: 'hubungan', label: 'Hubungan Kontak Darurat', category: 'Pendidikan & Keluarga', sample: 'Istri', required: false, getVal: emp => emp.hubungan || '-' },
  { key: 'kontak_darurat_nomor', label: 'No Kontak Darurat', category: 'Pendidikan & Keluarga', sample: '081234567891', required: false, getVal: emp => emp.kontak_darurat_nomor || '-' },

  { key: 'status_pajak', label: 'Status Pajak (PTKP)', category: 'Finansial & Jaminan', sample: 'K/1', required: false, getVal: emp => emp.status_pajak || 'TK/0' },
  { key: 'npwp', label: 'Nomor NPWP', category: 'Finansial & Jaminan', sample: '12.345.678.9-012.000', required: false, getVal: emp => emp.npwp || '-' },
  { key: 'nomor_kpj', label: 'BPJS Ketenagakerjaan (KPJ)', category: 'Finansial & Jaminan', sample: '12345678901', required: false, getVal: emp => emp.nomor_kpj || '-' },
  { key: 'nomor_jkn', label: 'BPJS Kesehatan (JKN)', category: 'Finansial & Jaminan', sample: '09876543210', required: false, getVal: emp => emp.nomor_jkn || '-' },
  { key: 'nama_bank', label: 'Nama Bank', category: 'Finansial & Jaminan', sample: 'BCA', required: false, getVal: emp => emp.nama_bank || '-' },
  { key: 'nama_rekening', label: 'Nama Pemilik Rekening', category: 'Finansial & Jaminan', sample: 'BUDI SANTOSO', required: false, getVal: emp => emp.nama_rekening || emp.nama_lengkap || '-' },
  { key: 'nomor_rekening', label: 'Nomor Rekening Bank', category: 'Finansial & Jaminan', sample: '1234567890', required: false, getVal: emp => emp.nomor_rekening || '-' }
];

export const CATEGORIES = ['Identitas Pokok', 'Pekerjaan & Kontrak', 'Pendidikan & Keluarga', 'Finansial & Jaminan'];

// =========================================================================
// 1. IMPORT MODAL WITH TEMPLATE CUSTOMIZER & DRAG-AND-DROP PREVIEW
// =========================================================================
export const ImportEmployeeModal = ({ isOpen, onClose, onImportSuccess, addToast }) => {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'template'
  const [selectedTemplateCols, setSelectedTemplateCols] = useState(EMPLOYEE_COLUMNS.map(c => c.key));
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const toggleTemplateCol = (key) => {
    setSelectedTemplateCols(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const selectAllTemplateCols = () => setSelectedTemplateCols(EMPLOYEE_COLUMNS.map(c => c.key));
  const selectRequiredTemplateCols = () => setSelectedTemplateCols(EMPLOYEE_COLUMNS.filter(c => c.required).map(c => c.key));

  // Download Template in CSV or Excel
  const handleDownloadTemplate = (format = 'csv') => {
    const colsToExport = EMPLOYEE_COLUMNS.filter(c => selectedTemplateCols.includes(c.key));
    if (colsToExport.length === 0) {
      addToast('Pilih minimal satu kolom untuk template!', 'error');
      return;
    }

    const headers = colsToExport.map(c => c.key);
    const sampleRow = colsToExport.map(c => c.sample);

    if (format === 'csv') {
      let csv = '\uFEFF' + headers.join(',') + '\n' + sampleRow.map(v => `"${v}"`).join(',') + '\n';
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Template_Import_Karyawan_PT_DEA_${colsToExport.length}_Kolom.csv`;
      link.click();
      addToast(`Template CSV (${colsToExport.length} Kolom) berhasil diunduh.`, 'success');
    } else {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
      XLSX.utils.book_append_sheet(wb, ws, 'Template Karyawan');
      XLSX.writeFile(wb, `Template_Import_Karyawan_PT_DEA_${colsToExport.length}_Kolom.xlsx`);
      addToast(`Template Excel (.xlsx) berhasil diunduh.`, 'success');
    }
  };

  // Process File Parsing
  const processUploadedFile = (uploadedFile) => {
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setIsParsing(true);
    const ext = uploadedFile.name.split('.').pop().toLowerCase();

    if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          setParsedData(data);
          addToast(`File ${uploadedFile.name} berhasil dibaca (${data.length} baris data).`, 'info');
        } catch (e) {
          console.error(e);
          addToast('Gagal membaca file Excel. Pastikan format valid.', 'error');
        } finally {
          setIsParsing(false);
        }
      };
      reader.readAsBinaryString(uploadedFile);
    } else {
      Papa.parse(uploadedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setParsedData(results.data || []);
          setIsParsing(false);
          addToast(`File CSV berhasil dibaca (${results.data?.length || 0} baris data).`, 'info');
        },
        error: (err) => {
          console.error(err);
          setIsParsing(false);
          addToast('Gagal memproses file CSV.', 'error');
        }
      });
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processUploadedFile(e.target.files[0]);
    }
  };

  const handleSubmitImport = async () => {
    if (!parsedData || parsedData.length === 0) {
      addToast('Pilih dan unggah file yang berisi data karyawan terlebih dahulu!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await onImportSuccess(parsedData);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center font-bold shadow-xs">
              <Upload size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Import Data Karyawan</h2>
              <p className="text-xs text-slate-500 font-medium">Unggah file CSV / Excel atau sesuaikan template dokumen</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-red-100 hover:text-red-900 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 p-1.5 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'upload' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload size={14} /> 1. Upload & Import Data
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('template')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'template' ? 'bg-white text-red-900 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings2 size={14} /> 2. Kustomisasi & Unduh Template Dokumen
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'upload' ? (
            <div className="space-y-4">
              {/* Quick Template Download Banner */}
              <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 text-red-700 rounded-xl shrink-0"><FileSpreadsheet size={20} /></div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">Belum memiliki format file?</h4>
                    <p className="text-[11px] text-slate-500">Unduh template standar berisi semua kolom data karyawan resmi PT DEA GLOBAL NIAGA.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate('csv')}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Download size={12} /> Template .CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate('xlsx')}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <FileSpreadsheet size={12} /> Template .XLSX
                  </button>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                  isDragging ? 'border-red-600 bg-red-50/50 scale-[0.99]' : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                }`}
                onClick={() => document.getElementById('emp-bulk-input')?.click()}
              >
                <input
                  id="emp-bulk-input"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-red-700 mb-3">
                  <Upload size={24} />
                </div>
                <p className="text-sm font-black text-slate-800">
                  {file ? file.name : 'Tarik & lepas file CSV / Excel di sini'}
                </p>
                <p className="text-xs text-slate-400 mt-1">atau klik untuk memilih file dari komputer (.csv, .xlsx, .xls)</p>
                {file && (
                  <span className="mt-3 text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    {(file.size / 1024).toFixed(1)} KB • {parsedData.length} baris terdeteksi
                  </span>
                )}
              </div>

              {/* Parsed Data Preview */}
              {parsedData.length > 0 && (
                <div className="space-y-2 border border-slate-200 rounded-2xl p-3.5 bg-slate-50">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                    <span className="font-black text-slate-800 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600" /> Pratinjau 5 Baris Pertama ({parsedData.length} Total Baris)
                    </span>
                    <button
                      type="button"
                      onClick={() => { setFile(null); setParsedData([]); }}
                      className="text-red-600 hover:underline font-bold text-[11px] cursor-pointer"
                    >
                      Hapus & Pilih Ulang
                    </button>
                  </div>
                  <div className="overflow-x-auto max-h-44 text-[11px]">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-200/70 text-slate-700 font-black">
                          {Object.keys(parsedData[0] || {}).slice(0, 7).map((key, i) => (
                            <th key={i} className="p-2 border border-slate-300/80 truncate max-w-[120px]">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-medium">
                        {parsedData.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-white transition-colors">
                            {Object.values(row).slice(0, 7).map((val, cIdx) => (
                              <td key={cIdx} className="p-2 border border-slate-200/80 truncate max-w-[120px]">
                                {String(val || '-')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Tab 2: Template Customizer */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-black text-slate-900">Pilih Kolom Template Dokumen</h3>
                  <p className="text-[11px] text-slate-500">Centang kolom data yang ingin disertakan sebelum mengunduh berkas template.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllTemplateCols}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Pilih Semua ({EMPLOYEE_COLUMNS.length})
                  </button>
                  <button
                    type="button"
                    onClick={selectRequiredTemplateCols}
                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-800 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Hanya Kolom Wajib
                  </button>
                </div>
              </div>

              {/* Categories & Column Checkboxes */}
              <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                {CATEGORIES.map(cat => {
                  const cols = EMPLOYEE_COLUMNS.filter(c => c.category === cat);
                  const isAllCatSelected = cols.every(c => selectedTemplateCols.includes(c.key));

                  return (
                    <div key={cat} className="border border-slate-200 rounded-2xl p-3.5 bg-slate-50/70 space-y-2.5">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                        <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          <Layers size={13} className="text-red-700" /> {cat}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (isAllCatSelected) {
                              setSelectedTemplateCols(prev => prev.filter(k => !cols.map(c => c.key).includes(k)));
                            } else {
                              setSelectedTemplateCols(prev => Array.from(new Set([...prev, ...cols.map(c => c.key)])));
                            }
                          }}
                          className="text-[10px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          {isAllCatSelected ? 'Batal Pilih Kategori' : 'Pilih Semua Kategori'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {cols.map(col => {
                          const isChecked = selectedTemplateCols.includes(col.key);
                          return (
                            <label
                              key={col.key}
                              className={`flex items-start gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                                isChecked ? 'bg-white border-red-200 text-slate-900 font-bold shadow-2xs' : 'bg-slate-100/60 border-slate-200 text-slate-500'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleTemplateCol(col.key)}
                                className="mt-0.5 rounded text-red-600 focus:ring-red-500"
                              />
                              <div className="min-w-0 flex-1">
                                <span className="block leading-tight">{col.label} {col.required && <strong className="text-red-600">*</strong>}</span>
                                <span className="text-[10px] text-slate-400 font-mono block mt-0.5 truncate">Contoh: {col.sample}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Download Buttons from Template Tab */}
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-600">
                  Terpilih: <strong className="text-red-800 font-black">{selectedTemplateCols.length}</strong> dari {EMPLOYEE_COLUMNS.length} Kolom
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate('csv')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Download size={14} /> Unduh CSV (.csv)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate('xlsx')}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <FileSpreadsheet size={14} /> Unduh Excel (.xlsx)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
          >
            Tutup
          </button>

          {activeTab === 'upload' ? (
            <button
              type="button"
              disabled={isSubmitting || parsedData.length === 0}
              onClick={handleSubmitImport}
              className="px-6 py-2.5 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {isSubmitting ? 'Memproses Import...' : `Import ${parsedData.length} Karyawan`}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              Kembali ke Upload <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};


// =========================================================================
// 2. ADVANCED EXPORT MODAL WITH COLUMN & ROW CHECKLIST SELECTION
// =========================================================================
export const ExportEmployeeModal = ({ 
  isOpen, 
  onClose, 
  employees = [], 
  filteredEmployees = [], 
  selectedIds = [], 
  addToast 
}) => {
  const [rowScope, setRowScope] = useState(selectedIds.length > 0 ? 'selected' : 'filtered'); // 'filtered' | 'selected' | 'all'
  const [selectedCols, setSelectedCols] = useState(EMPLOYEE_COLUMNS.map(c => c.key));

  if (!isOpen) return null;

  const toggleCol = (key) => {
    setSelectedCols(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const selectAll = () => setSelectedCols(EMPLOYEE_COLUMNS.map(c => c.key));
  const selectMain = () => setSelectedCols(['nomor_pegawai', 'nik', 'nama_lengkap', 'department', 'jabatan', 'penempatan', 'level', 'status_karyawan', 'join_date']);

  // Get target rows
  const getTargetRows = () => {
    if (rowScope === 'selected' && selectedIds.length > 0) {
      return employees.filter(e => selectedIds.includes(e.id || e._id));
    }
    if (rowScope === 'filtered') {
      return filteredEmployees;
    }
    return employees;
  };

  const targetRows = getTargetRows();
  const activeCols = EMPLOYEE_COLUMNS.filter(c => selectedCols.includes(c.key));

  const handleExportCSV = () => {
    if (targetRows.length === 0 || activeCols.length === 0) {
      addToast('Tidak ada data atau kolom yang dipilih untuk diekspor.', 'error');
      return;
    }

    const headers = activeCols.map(c => c.label);
    const rows = targetRows.map(emp => activeCols.map(c => c.getVal(emp)));

    let csv = '\uFEFF';
    csv += `DATA KARYAWAN PT DEA GLOBAL NIAGA\n`;
    csv += `Tanggal Ekspor: ${new Date().toLocaleDateString('id-ID')} | Total Data: ${targetRows.length} Karyawan\n\n`;
    csv += headers.map(h => `"${h}"`).join(',') + '\n';
    rows.forEach(r => {
      csv += r.map(v => `"${v}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Data_Karyawan_PT_DEA_${targetRows.length}_Orang.csv`;
    link.click();
    addToast(`Berhasil mengekspor ${targetRows.length} data ke format .CSV`, 'success');
    onClose();
  };

  const handleExportExcel = () => {
    if (targetRows.length === 0 || activeCols.length === 0) {
      addToast('Tidak ada data atau kolom yang dipilih untuk diekspor.', 'error');
      return;
    }

    const headers = activeCols.map(c => c.label);
    const rows = targetRows.map(emp => activeCols.map(c => c.getVal(emp)));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Data Karyawan');
    XLSX.writeFile(wb, `Data_Karyawan_PT_DEA_${targetRows.length}_Orang.xlsx`);
    addToast(`Berhasil mengekspor ${targetRows.length} data ke format .XLSX (Excel)`, 'success');
    onClose();
  };

  const handleExportPDF = () => {
    if (targetRows.length === 0 || activeCols.length === 0) {
      addToast('Tidak ada data atau kolom yang dipilih untuk dicetak.', 'error');
      return;
    }

    const headers = activeCols.map(c => c.label);
    const rows = targetRows.map(emp => activeCols.map(c => c.getVal(emp)));

    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Data Karyawan PT DEA GLOBAL NIAGA</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #1e293b; font-size: 10px; }
        h1 { font-size: 15px; margin: 0 0 4px 0; color: #000; }
        p { font-size: 10px; color: #64748b; margin: 0 0 14px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9px; }
        th, td { border: 1px solid #cbd5e1; padding: 5px 6px; text-align: left; }
        th { background: #f8fafc; font-weight: bold; text-transform: uppercase; font-size: 8px; color: #334155; }
      </style></head><body>
        <h1>PT DEA GLOBAL NIAGA — LAPORAN DATA KARYAWAN</h1>
        <p>Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} | Total: ${targetRows.length} Karyawan | ${activeCols.length} Kolom</p>
        <table>
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">No</th>
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map((r, i) => `
              <tr>
                <td style="text-align: center; color: #64748b;">${i + 1}</td>
                ${r.map(v => `<td>${v}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body></html>
    `);
    win.document.close();
    win.print();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shadow-xs">
              <Download size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Ekspor Data Karyawan</h2>
              <p className="text-xs text-slate-500 font-medium">Pilih baris dan kolom yang ingin diekspor ke CSV, Excel, atau PDF</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-red-100 hover:text-red-900 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* 1. Row Scope Selection */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-2.5">
            <span className="text-xs font-black text-slate-900 block">1. Pilih Baris Data yang Diekspor</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label 
                className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                  rowScope === 'filtered' ? 'bg-white border-emerald-300 text-slate-900 shadow-2xs' : 'bg-slate-100/60 border-slate-200 text-slate-500'
                }`}
              >
                <input 
                  type="radio" 
                  name="rowScope" 
                  checked={rowScope === 'filtered'} 
                  onChange={() => setRowScope('filtered')} 
                  className="text-emerald-600"
                />
                <div>
                  <span className="block">Semua Hasil Filter</span>
                  <span className="text-[10px] text-slate-400 font-normal">{filteredEmployees.length} Karyawan Terdaftar</span>
                </div>
              </label>

              <label 
                className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-bold transition-all ${
                  selectedIds.length === 0 ? 'opacity-40 cursor-not-allowed bg-slate-100/40 border-slate-200' : 
                  rowScope === 'selected' ? 'bg-white border-emerald-300 text-slate-900 shadow-2xs cursor-pointer' : 'bg-slate-100/60 border-slate-200 text-slate-500 cursor-pointer'
                }`}
              >
                <input 
                  type="radio" 
                  name="rowScope" 
                  disabled={selectedIds.length === 0}
                  checked={rowScope === 'selected'} 
                  onChange={() => setRowScope('selected')} 
                  className="text-emerald-600"
                />
                <div>
                  <span className="block">Hanya Baris Dicentang</span>
                  <span className="text-[10px] text-slate-400 font-normal">{selectedIds.length} Karyawan Dipilih di Tabel</span>
                </div>
              </label>
            </div>
          </div>

          {/* 2. Column Checklist Selection */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
              <span className="text-xs font-black text-slate-900">2. Pilih Kolom Data yang Disertakan ({activeCols.length} Kolom)</span>
              <div className="flex items-center gap-2">
                <button 
                  type="button" 
                  onClick={selectAll} 
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Pilih Semua ({EMPLOYEE_COLUMNS.length})
                </button>
                <button 
                  type="button" 
                  onClick={selectMain} 
                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Data Pokok Saja
                </button>
              </div>
            </div>

            <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
              {CATEGORIES.map(cat => {
                const cols = EMPLOYEE_COLUMNS.filter(c => c.category === cat);
                const isAllCatSelected = cols.every(c => selectedCols.includes(c.key));

                return (
                  <div key={cat} className="border border-slate-200 rounded-2xl p-3 bg-slate-50/60 space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200/50">
                      <span className="text-[11px] font-black text-slate-700">{cat}</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (isAllCatSelected) {
                            setSelectedCols(prev => prev.filter(k => !cols.map(c => c.key).includes(k)));
                          } else {
                            setSelectedCols(prev => Array.from(new Set([...prev, ...cols.map(c => c.key)])));
                          }
                        }}
                        className="text-[10px] font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        {isAllCatSelected ? 'Batal Pilih' : 'Pilih Semua'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {cols.map(col => {
                        const isChecked = selectedCols.includes(col.key);
                        return (
                          <label 
                            key={col.key} 
                            className={`flex items-center gap-2 p-1.5 rounded-lg border text-[11px] cursor-pointer transition ${
                              isChecked ? 'bg-white border-emerald-200 text-slate-900 font-bold shadow-2xs' : 'bg-slate-100/50 border-slate-200 text-slate-500'
                            }`}
                          >
                            <input 
                              type="checkbox" 
                              checked={isChecked} 
                              onChange={() => toggleCol(col.key)} 
                              className="rounded text-emerald-600"
                            />
                            <span className="truncate">{col.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <span className="text-xs font-bold text-slate-600">
            Total Target: <strong className="text-emerald-800 font-black">{targetRows.length} Karyawan</strong> • <strong className="text-slate-900">{activeCols.length} Kolom</strong>
          </span>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Download size={13} /> Export CSV
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <FileSpreadsheet size={13} /> Export Excel (.xlsx)
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="px-3.5 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Printer size={13} /> Cetak PDF
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
