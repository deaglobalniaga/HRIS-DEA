import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Download, Printer, FileText, Maximize2, RotateCw } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const PdfViewerModal = ({ url, onClose, fileName = "Dokumen Karyawan" }) => {
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.2);
    const [rotation, setRotation] = useState(0);
    const [loading, setLoading] = useState(true);

    const isImage = url && (
        url.startsWith('data:image/') ||
        url.toLowerCase().endsWith('.png') ||
        url.toLowerCase().endsWith('.jpg') ||
        url.toLowerCase().endsWith('.jpeg') ||
        url.toLowerCase().endsWith('.webp')
    );

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
        setLoading(false);
    };

    const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3.5));
    const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
    const rotate = () => setRotation(prev => (prev + 90) % 360);
    const prevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
    const nextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages || 1));

    // Handle Escape key to close
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handlePrint = () => {
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
            printWindow.focus();
            printWindow.print();
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] w-screen h-screen bg-slate-950/95 backdrop-blur-md flex flex-col animate-in fade-in duration-200 select-none">
            {/* Top Toolbar */}
            <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between shrink-0 shadow-lg text-white">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center font-bold">
                        <FileText size={18} />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-slate-100 tracking-tight line-clamp-1">{fileName}</h3>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {isImage ? 'Gambar / Foto Resmi' : 'Dokumen PDF'}
                        </span>
                    </div>
                </div>

                {/* Center Controls: Zoom, Rotate & Pages */}
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700/80 rounded-xl p-1">
                        <button
                            onClick={zoomOut}
                            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition"
                            title="Zoom Out"
                        >
                            <ZoomOut size={16} />
                        </button>
                        <span className="text-xs font-mono font-bold w-12 text-center text-slate-300">
                            {Math.round(scale * 100)}%
                        </span>
                        <button
                            onClick={zoomIn}
                            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition"
                            title="Zoom In"
                        >
                            <ZoomIn size={16} />
                        </button>
                    </div>

                    <button
                        onClick={rotate}
                        className="p-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 rounded-xl text-slate-300 hover:text-white transition"
                        title="Putar 90 Derajat"
                    >
                        <RotateCw size={16} />
                    </button>

                    {!isImage && numPages > 1 && (
                        <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-xl p-1">
                            <button 
                                onClick={prevPage} 
                                disabled={pageNumber <= 1}
                                className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-xs font-mono font-bold text-slate-300 min-w-[50px] text-center">
                                {pageNumber} / {numPages}
                            </span>
                            <button 
                                onClick={nextPage} 
                                disabled={pageNumber >= numPages}
                                className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
                
                {/* Right Controls: Actions & Close */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePrint}
                        className="p-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 rounded-xl text-slate-300 hover:text-white transition hidden sm:flex items-center gap-1.5 text-xs font-bold"
                        title="Cetak Dokumen"
                    >
                        <Printer size={16} /> <span className="hidden md:inline">Cetak</span>
                    </button>

                    <a 
                        href={url} 
                        download={fileName}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition flex items-center gap-1.5 text-xs font-bold shadow-md shadow-red-900/30"
                        title="Unduh Berkas"
                    >
                        <Download size={16} /> <span className="hidden md:inline">Unduh</span>
                    </a>

                    <button 
                        onClick={onClose} 
                        className="p-2 bg-slate-800 hover:bg-red-600/80 text-slate-300 hover:text-white rounded-xl transition border border-slate-700/80 ml-1"
                        title="Tutup (Esc)"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Document Full Viewport Area */}
            <div className="flex-1 w-full h-[calc(100vh-65px)] overflow-auto bg-slate-950 p-4 sm:p-8 flex justify-center items-center relative custom-scrollbar">
                {isImage ? (
                    <div 
                        className="transition-transform duration-200 flex items-center justify-center max-w-full max-h-full"
                        style={{ transform: `scale(${scale}) rotate(${rotation}deg)` }}
                    >
                        <img 
                            src={url} 
                            alt={fileName} 
                            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-slate-800 bg-white" 
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-start min-h-full">
                        {loading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                <div className="animate-spin w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full"></div>
                                <span className="text-xs font-bold text-slate-400">Memuat Dokumen Full-Page...</span>
                            </div>
                        )}
                        <Document
                            file={url}
                            onLoadSuccess={onDocumentLoadSuccess}
                            loading=""
                            error={
                                <div className="text-center p-8 bg-slate-900 border border-slate-800 rounded-2xl text-slate-300 max-w-md shadow-2xl">
                                    <FileText size={36} className="text-red-500 mx-auto mb-2" />
                                    <p className="font-bold text-sm text-red-400 mb-1">Gagal merender file PDF.</p>
                                    <p className="text-xs text-slate-400 mb-4">File mungkin disimpan dalam format terkompresi atau browser memblokir objek PDF.</p>
                                    <a
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 transition inline-block"
                                    >
                                        Buka di Tab Baru / Unduh
                                    </a>
                                </div>
                            }
                        >
                            <div 
                                className="bg-white shadow-2xl rounded-xl overflow-hidden mb-6 transition-transform duration-200 origin-top"
                                style={{ transform: `scale(${scale}) rotate(${rotation}deg)` }}
                            >
                                <Page 
                                    pageNumber={pageNumber} 
                                    scale={1.5}
                                    renderAnnotationLayer={false} 
                                    renderTextLayer={false} 
                                    loading=""
                                />
                            </div>
                        </Document>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PdfViewerModal;
