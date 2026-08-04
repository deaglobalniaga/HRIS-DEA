import collections
import collections.abc
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor

def create_presentation():
    prs = Presentation()
    
    # Title Slide
    title_slide_layout = prs.slide_layouts[0]
    slide = prs.slides.add_slide(title_slide_layout)
    title = slide.shapes.title
    subtitle = slide.placeholders[1]
    
    title.text = "SISTEM INFORMASI SUMBER DAYA MANUSIA (HRIS)"
    title.text_frame.paragraphs[0].font.size = Pt(36)
    title.text_frame.paragraphs[0].font.bold = True
    title.text_frame.paragraphs[0].font.color.rgb = RGBColor(128, 0, 0)
    
    subtitle.text = "PT DEA GLOBAL NIAGA\nSolusi Otomatisasi & Digitalisasi HRD"

    # Slide 1: Permasalahan (Masalah)
    slide_layout = prs.slide_layouts[1]
    slide = prs.slides.add_slide(slide_layout)
    slide.shapes.title.text = "Latar Belakang & Permasalahan"
    body = slide.placeholders[1].text_frame
    body.text = "Proses HR Manual Menimbulkan Tantangan Besar:"
    p = body.add_paragraph()
    p.text = "1. Pencatatan Jam Kerja Tidak Akurat (Risiko Manipulasi/Titip Absen)."
    p.level = 1
    p = body.add_paragraph()
    p.text = "2. Kehilangan Data Cuti (Pengajuan berbasis kertas/pesan singkat)."
    p.level = 1
    p = body.add_paragraph()
    p.text = "3. Efisiensi Waktu Terbuang (Perekapan gaji & absensi bulanan lambat)."
    p.level = 1
    p = body.add_paragraph()
    p.text = "4. Transparansi Kinerja Rendah."
    p.level = 1

    # Slide 2: Solusi Utama (Solusi)
    slide = prs.slides.add_slide(slide_layout)
    slide.shapes.title.text = "Solusi HRIS Berbasis Web"
    body = slide.placeholders[1].text_frame
    body.text = "Transformasi Digital melalui HRIS Modern:"
    p = body.add_paragraph()
    p.text = "Kehadiran Berbasis Lokasi (GPS) & Pengenalan Wajah (Face API)."
    p.level = 1
    p = body.add_paragraph()
    p.text = "Pengajuan Cuti & Izin Digital secara Real-time."
    p.level = 1
    p = body.add_paragraph()
    p.text = "Sistem PWA (Progressive Web App): Bisa di-Install di Android & iOS."
    p.level = 1
    p = body.add_paragraph()
    p.text = "Dashboard Analitik Lanjutan bagi Manajemen."
    p.level = 1

    # Slide 3: Fitur 1 - Autentikasi
    slide = prs.slides.add_slide(slide_layout)
    slide.shapes.title.text = "Fitur: Keamanan & Autentikasi"
    body = slide.placeholders[1].text_frame
    body.text = "Pemisahan Hak Akses Multi-Level:"
    p = body.add_paragraph()
    p.text = "Admin/HR: Memiliki akses penuh ke pelaporan dan persetujuan."
    p.level = 1
    p = body.add_paragraph()
    p.text = "Pegawai: Hanya dapat melihat data pribadi dan melakukan presensi."
    p.level = 1
    p = body.add_paragraph()
    p.text = "Keamanan Password dengan Bcrypt (Hash 10-rounds)."
    p.level = 1

    # Slide 4: Fitur 2 - Presensi Pintar
    slide = prs.slides.add_slide(slide_layout)
    slide.shapes.title.text = "Fitur: Presensi Pintar (Smart Attendance)"
    body = slide.placeholders[1].text_frame
    body.text = "Meniadakan Kecurangan dengan AI:"
    p = body.add_paragraph()
    p.text = "Deteksi Wajah Karyawan secara langsung dari browser."
    p.level = 1
    p = body.add_paragraph()
    p.text = "Validasi Koordinat GPS saat menekan tombol Check-In."
    p.level = 1
    p = body.add_paragraph()
    p.text = "Watermark otomatis pada foto (Waktu & Lokasi)."
    p.level = 1
    p = body.add_paragraph()
    p.text = "Kompresi Gambar Otomatis untuk menghemat penyimpanan cloud."
    p.level = 1

    # Slide 5: PWA & Kemudahan Akses
    slide = prs.slides.add_slide(slide_layout)
    slide.shapes.title.text = "Kemudahan Instalasi: Progressive Web App (PWA)"
    body = slide.placeholders[1].text_frame
    body.text = "Tidak Perlu App Store atau Play Store:"
    p = body.add_paragraph()
    p.text = "Buka link Vercel di browser (Safari/Chrome)."
    p.level = 1
    p = body.add_paragraph()
    p.text = "Pilih 'Tambahkan ke Layar Utama' (Add to Home Screen)."
    p.level = 1
    p = body.add_paragraph()
    p.text = "Tampil sebagai Aplikasi Native, lebih cepat & hemat kuota."
    p.level = 1

    # Slide 6: Kesimpulan
    slide = prs.slides.add_slide(slide_layout)
    slide.shapes.title.text = "Kesimpulan & Dampak Positif"
    body = slide.placeholders[1].text_frame
    body.text = "Return on Investment (ROI):"
    p = body.add_paragraph()
    p.text = "Memangkas waktu administratif hingga 80%."
    p.level = 1
    p = body.add_paragraph()
    p.text = "Disiplin Karyawan Meningkat Drastis."
    p.level = 1
    p = body.add_paragraph()
    p.text = "Pengambilan keputusan berbasis data yang akurat."
    p.level = 1

    prs.save('Presentasi_HRIS.pptx')
    print("Presentasi PPTX berhasil dibuat!")

if __name__ == '__main__':
    create_presentation()
