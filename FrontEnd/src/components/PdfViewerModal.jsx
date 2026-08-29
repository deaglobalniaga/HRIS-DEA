import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
    X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Download, Printer, 
    FileText, RotateCw, Award, ExternalLink, RefreshCcw, Trash2
} from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const extractUrl = (item) => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    if (typeof item === 'object') {
        return item.url || item.file_url || item.file_path || item.document_url || item.attachment_url || item.attachments || item.file || item.link || '';
    }
    return '';
};

const extractTitle = (item, fallback = 'Dokumen') => {
    if (!item) return fallback;
    if (typeof item === 'string') return fallback;
    if (typeof item === 'object') {
        return item.title || item.nama_sertifikat || item.certificate_name || item.name || item.fileName || fallback;
    }
    return fallback;
};

const PdfViewerModal = ({ 
    url = null, 
    pdfUrl = null,
    documentUrl = null,
    fileUrl = null,
    documents = [], 
    allCertificates = [],
    activeId = null,
    initialIndex = 0, 
    onClose, 
    onDelete = null,
    fileName = "Dokumen Karyawan" 
}) => {
    const rawUrl = url || pdfUrl || documentUrl || fileUrl;

    // Normalize all available certificates/documents
    const allDocs = useMemo(() => {
        let docs = [];
        const sourceList = (allCertificates && allCertificates.length > 0)
            ? allCertificates
            : (documents && documents.length > 0)
            ? documents
            : [];

        if (sourceList.length > 0) {
            docs = sourceList.map((item, idx) => {
                const u = extractUrl(item);
                const emp = item?.karyawan || item?.employee || {};
                const empName = emp?.nama_lengkap || emp?.nama || item?.employee_name || item?.holder_name || item?.user_name || item?.name || '';
                const certTitle = extractTitle(item, fileName);

                return {
                    id: item?.id || `cert-${idx}`,
                    employeeId: emp?.id || item?.employee_id || item?.user_id || empName,
                    employeeName: empName,
                    employeeNip: emp?.nomor_pegawai || item?.nomor_pegawai || '',
                    employeeDept: emp?.departemen || emp?.department || item?.department || item?.dept || '',
                    title: certTitle,
                    certNumber: item?.nomor_sertifikat || item?.certificate_number || '',
                    issuer: item?.institusi_penerbit || item?.organisasi_penerbit || item?.penerbit || '',
                    expiry: item?.is_lifetime ? 'Seumur Hidup' : (item?.tanggal_kadaluarsa || item?.expired_date || item?.expiry || ''),
                    isLifetime: Boolean(item?.is_lifetime),
                    url: u,
                    hasFile: Boolean(u)
                };
            }).filter(d => Boolean(d.url));
        }

        const fallbackUrl = extractUrl(rawUrl);
        if (fallbackUrl) {
            const exists = docs.some(d => d.url === fallbackUrl || (activeId && d.id === activeId));
            if (!exists) {
                const rawEmp = (typeof rawUrl === 'object' && rawUrl?.karyawan) ? rawUrl.karyawan : {};
                const rawEmpName = rawEmp?.nama_lengkap || rawEmp?.nama || (typeof rawUrl === 'object' ? rawUrl?.name : null) || '';
                const fallbackDoc = {
                    id: activeId || 'active-preview-doc',
                    employeeId: rawEmp?.id || 'emp-active',
                    employeeName: rawEmpName,
                    employeeNip: rawEmp?.nomor_pegawai || '',
                    employeeDept: rawEmp?.departemen || rawEmp?.department || '',
                    title: extractTitle(rawUrl, fileName),
                    certNumber: typeof rawUrl === 'object' ? (rawUrl?.nomor_sertifikat || rawUrl?.certificate_number || '') : '',
                    issuer: typeof rawUrl === 'object' ? (rawUrl?.institusi_penerbit || '') : '',
                    expiry: typeof rawUrl === 'object' ? (rawUrl?.tanggal_kadaluarsa || '') : '',
                    isLifetime: typeof rawUrl === 'object' ? Boolean(rawUrl?.is_lifetime) : false,
                    url: fallbackUrl,
                    hasFile: true
                };
                docs = [fallbackDoc, ...docs];
            }
        }
        return docs;
    }, [allCertificates, documents, rawUrl, activeId, fileName]);

    // Track active selected document ID
    const [selectedDocId, setSelectedDocId] = useState(() => {
        if (activeId && allDocs.some(d => d.id === activeId)) return activeId;
        if (rawUrl) {
            const match = allDocs.find(d => d.url === extractUrl(rawUrl));
            if (match) return match.id;
        }
        if (initialIndex >= 0 && initialIndex < allDocs.length) return allDocs[initialIndex].id;
        return allDocs[0]?.id || null;
    });

    useEffect(() => {
        if (activeId && allDocs.some(d => d.id === activeId)) {
            setSelectedDocId(activeId);
        } else if (rawUrl) {
            const match = allDocs.find(d => d.url === extractUrl(rawUrl));
            if (match) setSelectedDocId(match.id);
        }
    }, [activeId, rawUrl, allDocs]);

    const activeDoc = useMemo(() => {
        return allDocs.find(d => d.id === selectedDocId) || allDocs[0] || {};
    }, [allDocs, selectedDocId]);

    const activeIndex = useMemo(() => {
        return allDocs.findIndex(d => d.id === activeDoc.id);
    }, [allDocs, activeDoc]);

    // Filter documents for current user/context
    const currentEmployeeCerts = useMemo(() => {
        if (!activeDoc.employeeName) return allDocs;
        const scoped = allDocs.filter(d => d.employeeName === activeDoc.employeeName);
        return scoped.length > 0 ? scoped : allDocs;
    }, [allDocs, activeDoc]);

    const currentUrl = activeDoc.url || extractUrl(rawUrl);
    const currentTitle = activeDoc.title || fileName || 'Pratinjau Dokumen';

    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [rotation, setRotation] = useState(0);
    const [loading, setLoading] = useState(true);
    const [pdfError, setPdfError] = useState(false);

    const containerRef = useRef(null);
    const [containerWidth, setContainerWidth] = useState(900);

    // Measure viewport container width dynamically
    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.clientWidth);
            } else {
                setContainerWidth(window.innerWidth > 1024 ? 960 : window.innerWidth - 48);
            }
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    const isImage = Boolean(
        typeof currentUrl === 'string' && currentUrl && (
            currentUrl.startsWith('data:image/') ||
            currentUrl.toLowerCase().includes('.png') ||
            currentUrl.toLowerCase().includes('.jpg') ||
            currentUrl.toLowerCase().includes('.jpeg') ||
            currentUrl.toLowerCase().includes('.webp') ||
            currentUrl.toLowerCase().includes('.svg') ||
            currentUrl.toLowerCase().includes('.gif')
        )
    );

    // Reset page & loading state when switching documents
    useEffect(() => {
        setPageNumber(1);
        setNumPages(null);
        setLoading(true);
        setPdfError(false);
        setScale(1.0);
        setRotation(0);
    }, [selectedDocId, currentUrl]);

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
        setLoading(false);
        setPdfError(false);
    };

    const onDocumentLoadError = () => {
        setLoading(false);
        setPdfError(true);
    };

    const zoomIn = (e) => {
        if (e) e.stopPropagation();
        setScale(prev => Math.min(Number((prev + 0.15).toFixed(2)), 3.0));
    };

    const zoomOut = (e) => {
        if (e) e.stopPropagation();
        setScale(prev => Math.max(Number((prev - 0.15).toFixed(2)), 0.4));
    };

    const resetZoom = (e) => {
        if (e) e.stopPropagation();
        setScale(1.0);
    };

    const rotate = (e) => {
        if (e) e.stopPropagation();
        setRotation(prev => (prev + 90) % 360);
    };

    const prevPage = (e) => {
        if (e) e.stopPropagation();
        setPageNumber(prev => Math.max(prev - 1, 1));
    };

    const nextPage = (e) => {
        if (e) e.stopPropagation();
        setPageNumber(prev => Math.min(prev + 1, numPages || 1));
    };

    // Handle Keyboard Navigation (Escape, Arrows)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowLeft' && !isImage && numPages > 1) {
                setPageNumber(prev => Math.max(prev - 1, 1));
            } else if (e.key === 'ArrowRight' && !isImage && numPages > 1) {
                setPageNumber(prev => Math.min(prev + 1, numPages || 1));
            } else if (e.key === '+' || e.key === '=') {
                setScale(prev => Math.min(Number((prev + 0.15).toFixed(2)), 3.0));
            } else if (e.key === '-') {
                setScale(prev => Math.max(Number((prev - 0.15).toFixed(2)), 0.4));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, numPages, isImage]);

    const handlePrint = (e) => {
        if (e) e.stopPropagation();
        if (!currentUrl) return;
        const printWindow = window.open(currentUrl, '_blank');
        if (printWindow) {
            printWindow.focus();
            printWindow.print();
        }
    };

    const handleDownload = (e) => {
        if (e) e.stopPropagation();
        if (!currentUrl) return;
        const a = document.createElement('a');
        a.href = currentUrl;
        a.download = `${currentTitle.replace(/\s+/g, '_')}`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    // Calculate dynamic rendered page width
    const calculatedPageWidth = useMemo(() => {
        if (!containerWidth) return 850;
        const baseWidth = Math.min(containerWidth - 48, 1050);
        return Math.max(baseWidth * scale, 360);
    }, [containerWidth, scale]);

    const modalContent = (
        <div 
            className="fixed inset-0 z-[99999] w-screen h-screen bg-slate-900/60 backdrop-blur-sm flex flex-col animate-in fade-in duration-150"
            onClick={(e) => {
                // Click on outer backdrop to close
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {/* 1. CLEAN LIGHT HEADER BAR */}
            <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between shrink-0 shadow-sm text-slate-800 gap-3 z-10">
                {/* Left: Icon, Title, and Cert Selector */}
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-red-50 text-red-700 border border-red-200/80 flex items-center justify-center shrink-0">
                        <Award size={20} />
                    </div>

                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-sm text-slate-900 tracking-tight truncate max-w-[240px] sm:max-w-md">
                                {currentTitle}
                            </h3>
                            
                            {/* If user has multiple certificates, offer a clean dropdown right here */}
                            {currentEmployeeCerts.length > 1 && (
                                <select
                                    value={activeDoc.id || ''}
                                    onChange={(e) => setSelectedDocId(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-800 text-xs font-bold rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-red-500 cursor-pointer shadow-2xs"
                                >
                                    {currentEmployeeCerts.map((c, idx) => (
                                        <option key={c.id || idx} value={c.id}>
                                            {c.title} {c.certNumber ? `(${c.certNumber})` : ''}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 truncate">
                            {activeDoc.employeeName && (
                                <span className="font-bold text-slate-800">{activeDoc.employeeName}</span>
                            )}
                            {activeDoc.employeeDept && (
                                <span>• {activeDoc.employeeDept}</span>
                            )}
                            {activeDoc.certNumber && (
                                <span>• No: <strong className="font-mono text-slate-700">{activeDoc.certNumber}</strong></span>
                            )}
                            {activeDoc.expiry && (
                                <span className={activeDoc.isLifetime ? 'text-emerald-700 font-bold' : 'text-slate-600'}>
                                    • {activeDoc.isLifetime ? 'Seumur Hidup' : `Berlaku: ${activeDoc.expiry}`}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Center: Intuitive Light Zoom & Page Controls */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Zoom Group */}
                    <div className="flex items-center bg-slate-100 border border-slate-200/90 rounded-xl p-1 shadow-2xs">
                        <button
                            type="button"
                            onClick={zoomOut}
                            className="p-1.5 hover:bg-white active:bg-slate-200 rounded-lg text-slate-700 hover:text-slate-900 transition cursor-pointer"
                            title="Perkecil (-)"
                        >
                            <ZoomOut size={15} />
                        </button>
                        <button 
                            type="button"
                            onClick={resetZoom}
                            className="text-xs font-mono font-bold w-12 text-center text-slate-700 hover:text-slate-900 hover:bg-white active:bg-slate-200 rounded px-1 py-0.5 transition cursor-pointer"
                            title="Reset Skala 100%"
                        >
                            {Math.round(scale * 100)}%
                        </button>
                        <button
                            type="button"
                            onClick={zoomIn}
                            className="p-1.5 hover:bg-white active:bg-slate-200 rounded-lg text-slate-700 hover:text-slate-900 transition cursor-pointer"
                            title="Perbesar (+)"
                        >
                            <ZoomIn size={15} />
                        </button>
                    </div>

                    {/* Rotate */}
                    <button
                        type="button"
                        onClick={rotate}
                        className="p-2 bg-slate-100 hover:bg-white active:bg-slate-200 border border-slate-200/90 rounded-xl text-slate-700 hover:text-slate-900 transition cursor-pointer shadow-2xs"
                        title="Putar Dokumen 90°"
                    >
                        <RotateCw size={15} />
                    </button>

                    {/* Multi-Page Controls (if PDF has multiple pages) */}
                    {!isImage && numPages > 1 && (
                        <div className="flex items-center gap-1 bg-slate-100 border border-slate-200/90 rounded-xl p-1 shadow-2xs">
                            <button 
                                type="button"
                                onClick={prevPage} 
                                disabled={pageNumber <= 1}
                                className="p-1.5 hover:bg-white active:bg-slate-200 rounded-lg text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                                title="Halaman Sebelumnya"
                            >
                                <ChevronLeft size={15} />
                            </button>
                            <span className="text-xs font-mono font-bold text-slate-700 min-w-[40px] text-center">
                                {pageNumber} / {numPages}
                            </span>
                            <button 
                                type="button"
                                onClick={nextPage} 
                                disabled={pageNumber >= numPages}
                                className="p-1.5 hover:bg-white active:bg-slate-200 rounded-lg text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                                title="Halaman Berikutnya"
                            >
                                <ChevronRight size={15} />
                            </button>
                        </div>
                    )}
                </div>
                
                {/* Right: Print, Download, Delete, Close */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 transition hidden md:flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                        title="Cetak Dokumen"
                    >
                        <Printer size={15} /> <span>Cetak</span>
                    </button>

                    {currentUrl && (
                        <button 
                            type="button"
                            onClick={handleDownload}
                            className="px-3.5 py-2 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white rounded-xl transition flex items-center gap-1.5 text-xs font-bold shadow-sm cursor-pointer"
                            title="Unduh Berkas Asli"
                        >
                            <Download size={15} /> <span>Unduh</span>
                        </button>
                    )}

                    {onDelete && (
                        <button 
                            type="button"
                            onClick={() => onDelete(activeDoc)}
                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-xl transition border border-rose-200 cursor-pointer"
                            title="Hapus Sertifikat Ini Saja"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}

                    <button 
                        type="button"
                        onClick={onClose} 
                        className="p-2 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-700 rounded-xl transition border border-slate-200 cursor-pointer ml-1"
                        title="Tutup (Esc)"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* 2. CLEAN & SOFT LIGHT CANVAS DISPLAY AREA */}
            <div 
                ref={containerRef}
                className="flex-1 w-full h-full overflow-auto bg-slate-100/95 p-4 sm:p-8 flex justify-center items-start relative custom-scrollbar"
                onClick={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}
            >
                {isImage ? (
                    <div className="flex items-center justify-center min-h-full py-4 w-full">
                        <img 
                            src={currentUrl} 
                            alt={currentTitle} 
                            style={{ 
                                transform: `scale(${scale}) rotate(${rotation}deg)`,
                                transformOrigin: 'center center',
                                transition: 'transform 0.15s ease-out'
                            }}
                            className="max-w-[95%] max-h-[85vh] object-contain rounded-2xl shadow-xl border border-slate-300 bg-white" 
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-start min-h-full py-2 w-full">
                        {loading && (
                            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-700">
                                <div className="animate-spin w-9 h-9 border-3 border-red-700 border-t-transparent rounded-full"></div>
                                <span className="text-xs font-bold text-slate-500">Memuat Dokumen PDF...</span>
                            </div>
                        )}

                        <Document
                            file={currentUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={onDocumentLoadError}
                            loading=""
                            error={
                                <div className="text-center p-8 bg-white border border-slate-200 rounded-2xl text-slate-700 max-w-md shadow-xl my-12">
                                    <FileText size={42} className="text-red-600 mx-auto mb-3" />
                                    <p className="font-bold text-sm text-slate-900 mb-1">Pratinjau PDF tidak dapat dimuat langsung di peramban.</p>
                                    <p className="text-xs text-slate-500 mb-4">Dokumen aman dan dapat Anda buka atau unduh langsung di bawah ini.</p>
                                    <div className="flex justify-center gap-2">
                                        <a
                                            href={currentUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="px-4 py-2 bg-red-700 text-white font-bold text-xs rounded-xl hover:bg-red-800 transition inline-flex items-center gap-1.5 shadow-sm"
                                        >
                                            <ExternalLink size={14} /> Buka Tab Baru
                                        </a>
                                        <button
                                            type="button"
                                            onClick={handleDownload}
                                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition inline-flex items-center gap-1.5 border border-slate-300"
                                        >
                                            <Download size={14} /> Unduh File
                                        </button>
                                    </div>
                                </div>
                            }
                        >
                            <div 
                                className="bg-white shadow-xl rounded-xl overflow-hidden mb-8 transition-all duration-150 border border-slate-200"
                                style={{ transform: `rotate(${rotation}deg)` }}
                            >
                                <Page 
                                    pageNumber={pageNumber} 
                                    width={calculatedPageWidth}
                                    renderAnnotationLayer={false} 
                                    renderTextLayer={false} 
                                    devicePixelRatio={Math.min(window.devicePixelRatio || 1, 2)}
                                    loading=""
                                />
                            </div>
                        </Document>
                    </div>
                )}
            </div>
        </div>
    );

    if (typeof document !== 'undefined') {
        return createPortal(modalContent, document.body);
    }
    return modalContent;
};

export default PdfViewerModal;
