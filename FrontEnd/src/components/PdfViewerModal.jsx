import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const PdfViewerModal = ({ url, onClose, fileName = "Document" }) => {
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [loading, setLoading] = useState(true);

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
        setLoading(false);
    };

    const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
    const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
    const prevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
    const nextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages || 1));

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-slate-100 rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
                
                {/* Toolbar */}
                <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <h3 className="font-black text-slate-800 hidden sm:block">{fileName}</h3>
                        <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1">
                            <button onClick={zoomOut} className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 hover:shadow-sm transition" title="Zoom Out">
                                <ZoomOut size={18} />
                            </button>
                            <span className="text-xs font-bold w-12 text-center text-slate-500">{Math.round(scale * 100)}%</span>
                            <button onClick={zoomIn} className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 hover:shadow-sm transition" title="Zoom In">
                                <ZoomIn size={18} />
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {numPages > 1 && (
                            <div className="flex items-center gap-3 mr-4 bg-slate-100 rounded-xl p-1">
                                <button 
                                    onClick={prevPage} 
                                    disabled={pageNumber <= 1}
                                    className="p-1.5 hover:bg-white rounded-lg text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="text-xs font-bold text-slate-500 min-w-[60px] text-center">
                                    {pageNumber} / {numPages}
                                </span>
                                <button 
                                    onClick={nextPage} 
                                    disabled={pageNumber >= numPages}
                                    className="p-1.5 hover:bg-white rounded-lg text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        )}
                        <a 
                            href={url} 
                            download 
                            className="p-2 hover:bg-blue-50 text-blue-600 rounded-xl transition-colors hidden sm:flex items-center gap-2 text-sm font-bold"
                            title="Download PDF"
                        >
                            <Download size={18} /> <span className="hidden md:inline">Download</span>
                        </a>
                        <button onClick={onClose} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* PDF Content Area */}
                <div className="flex-1 overflow-auto bg-slate-200/50 p-4 flex justify-center items-start custom-scrollbar relative">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="animate-spin w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full"></div>
                        </div>
                    )}
                    <Document
                        file={url}
                        onLoadSuccess={onDocumentLoadSuccess}
                        loading=""
                        error={<div className="text-red-500 font-bold p-8 bg-white rounded-xl shadow-sm">Gagal memuat PDF. Harap periksa apakah file tersedia.</div>}
                    >
                        <div className="bg-white shadow-xl mb-4 transition-transform origin-top">
                            <Page 
                                pageNumber={pageNumber} 
                                scale={scale} 
                                renderAnnotationLayer={false} 
                                renderTextLayer={false} 
                                loading=""
                            />
                        </div>
                    </Document>
                </div>
            </div>
        </div>
    );
};

export default PdfViewerModal;
