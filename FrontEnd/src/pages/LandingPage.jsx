import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]"><div className="h-16 max-w-[1440px] mx-auto px-margin-desktop flex items-center justify-between"><div className="flex items-center gap-sm"><img alt="Stitch HR Logo" className="h-8 w-auto object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBENklGC4hWh4htOsvsclpTJR5i0byjfP286e5dx8Cu8FNjTz21fPHwNuUMWC6jjE7NTmS3Pbp7zJHFkzWhtxb47iwfWYwe2RxKvIWRdJpRzewMNhvbXt33Q6-i_UmNbxVzpcwnbra_4KpHxupm6gDWkI5jpiHkfoG7jpmwRAp-DnoL4-cY5GlkSQwNfj9dxn8jMiFPCdnJaEUHD6-NPyQm_xTJR4UODEQ3T0NBfZIfmO2Ly_euwEva"/><span className="font-headline-md text-headline-md text-primary tracking-tight">Stitch HR</span></div><nav className="hidden md:flex items-center gap-lg" data-active-classes="text-primary font-bold"><a aria-current="page" className="transition-colors text-primary font-bold" data-path="home" href="#">Home</a><a className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors" data-path="features" href="#">Features</a><a className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors" data-path="pricing" href="#">Pricing</a><a className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors" data-path="login" href="#">Login</a><a className="px-md py-xs bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors" data-path="register" href="#">Register</a></nav><div className="flex items-center gap-md"><div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"><span className="material-symbols-outlined text-on-primary text-[18px]">person</span></div></div></div></header><main className="w-full pt-16"><div className="flex flex-col w-full relative overflow-hidden bg-background">

<div className="absolute inset-0 pointer-events-none overflow-hidden">
<div className="absolute top-[-10%] right-[-5%] w-[50%] h-[50%] bg-primary-fixed/30 rounded-full blur-[120px]"></div>
<div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-tertiary-fixed/20 rounded-full blur-[100px]"></div>
</div>

<section className="relative w-full max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop pt-[120px] pb-24 md:pb-32 flex flex-col items-center justify-center min-h-[819px]">
<div className="flex flex-col md:flex-row items-center gap-xl md:gap-16 w-full">

<div className="flex flex-col gap-lg w-full md:w-1/2 z-10 text-center md:text-left">
<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed w-fit mx-auto md:mx-0 shadow-sm">
<span className="material-symbols-outlined text-[16px]">bolt</span>
<span className="font-label-md text-label-md uppercase tracking-wider">Sistem HR Modern</span>
</div>
<h1 className="font-display-lg text-[40px] md:text-[56px] leading-[1.1] font-bold text-on-surface tracking-tight" style={{"fontFamily": "'Inter', sans-serif"}}>
          Absensi & Payroll Karyawan <span className="text-primary">Otomatis</span> dalam Satu Sistem
        </h1>
<p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mx-auto md:mx-0">
          Tingkatkan produktivitas tim Anda dengan sistem manajemen kehadiran berbasis AI dan penggajian otomatis yang aman, cepat, dan akurat.
        </p>
<div className="flex flex-col sm:flex-row items-center gap-4 mt-4 justify-center md:justify-start">
<button className="w-full sm:w-auto h-12 px-8 bg-primary text-on-primary rounded-xl font-label-md text-label-md hover:bg-primary-container transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group">
            Mulai Sekarang
            <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
</button>
<button className="w-full sm:w-auto h-12 px-8 bg-surface-container text-on-surface rounded-xl font-label-md text-label-md hover:bg-surface-container-high transition-all flex items-center justify-center gap-2">
            Pelajari Lebih Lanjut
          </button>
</div>

<div className="mt-8 flex flex-col gap-4">
<span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest text-center md:text-left">Dipercaya oleh 500+ Perusahaan</span>
<div className="flex items-center justify-center md:justify-start gap-6 opacity-60 grayscale">
<span className="font-headline-md text-headline-md font-bold">ACME Corp</span>
<span className="font-headline-md text-headline-md font-bold">Globex</span>
<span className="font-headline-md text-headline-md font-bold">Soylent</span>
<span className="font-headline-md text-headline-md font-bold hidden sm:block">Initech</span>
</div>
</div>
</div>

<div className="w-full md:w-1/2 relative z-10">
<div className="relative w-full aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl bg-surface-container-lowest">

<img className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" data-alt="A clean, modern flat vector illustration showing HR concepts. On the left, a stylized employee interacting with a facial recognition attendance terminal glowing with a subtle blue aura. On the right, a floating UI panel depicting a payroll dashboard with colorful bar charts and data tables. The background should be a minimal grid or soft abstract shapes in corporate blue and white, maintaining a highly professional, tech-forward aesthetic. Smooth gradients, no harsh lines." src="https://lh3.googleusercontent.com/aida-public/AB6AXuASWfvILwtlnOdWRDaGSbVURjmSfEwyFU1ufO121PYqLvJSVUDwlZZoqfLzrZ50Zc99be9EVHOLJbvaSMVwxi8H4tyumoXSOTANtz0OhaTDw5M-e2b33Sw5a2O32RjNrbRxmfkfbwgm12Re1EjqAxWTR-2RAfN9AQCsMZbIpV41XxgXwaoE2luj3XSB2u-Ds0J62Ugg2-gjTI3kZV8CKaTZjEoDVzYT2T-N2zadRGFwzl8Q6pkaVGl-"/>

<div className="absolute -left-6 top-12 p-4 bg-surface/90 backdrop-blur-md rounded-xl shadow-xl border border-surface-variant animate-[float_6s_ease-in-out_infinite]">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center">
<span className="material-symbols-outlined text-on-secondary-fixed text-primary">face_retouching_natural</span>
</div>
<div>
<p className="font-label-md text-label-md text-on-surface">Absensi Berhasil</p>
<p className="font-body-md text-body-md text-on-surface-variant text-sm">08:00 AM</p>
</div>
</div>
</div>
<div className="absolute -right-4 bottom-24 p-4 bg-primary text-on-primary rounded-xl shadow-xl animate-[float_7s_ease-in-out_infinite_reverse]">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
<span className="material-symbols-outlined">payments</span>
</div>
<div>
<p className="font-label-md text-label-md text-white">Payroll Selesai</p>
<p className="font-body-md text-body-md text-white/80 text-sm">152 Karyawan</p>
</div>
</div>
</div>
</div>
</div>
</div>
</section>

<section className="w-full max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop py-24 relative z-20">
<div className="mb-16 text-center max-w-2xl mx-auto">
<h2 className="font-headline-lg text-headline-lg text-on-surface mb-4">Satu Platform untuk Semua Kebutuhan HR</h2>
<p className="font-body-md text-body-md text-on-surface-variant">Otomatisasi tugas repetitif dan fokus pada hal yang paling penting: tim Anda.</p>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-min">

<div className="col-span-1 md:col-span-2 bg-surface-container-low rounded-3xl p-8 flex flex-col md:flex-row gap-8 shadow-sm hover:shadow-md transition-shadow group overflow-hidden relative">
<div className="flex-1 flex flex-col justify-center relative z-10">
<div className="w-12 h-12 bg-primary-fixed rounded-2xl flex items-center justify-center mb-6">
<span className="material-symbols-outlined text-primary-container">location_on</span>
</div>
<h3 className="font-headline-md text-headline-md text-on-surface mb-3">Absensi Akurat dengan Geotagging & AI</h3>
<p className="font-body-md text-body-md text-on-surface-variant mb-6">Pantau kehadiran karyawan secara real-time dari mana saja. Dilengkapi teknologi pengenalan wajah dan validasi lokasi.</p>
<a className="font-label-md text-label-md text-primary inline-flex items-center gap-1 hover:text-primary-container w-fit" href="#">
            Lihat Fitur Absensi <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
</a>
</div>
<div className="flex-1 relative min-h-[200px] bg-surface rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">

<svg className="w-full h-full text-primary-fixed-dim" preserveAspectRatio="xMidYMid meet" viewBox="0 0 200 100">
<path d="M10,80 Q50,20 90,60 T190,30" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="4"/>
<circle className="animate-pulse" cx="50" cy="50" fill="#0052cc" r="4"/>
<circle className="animate-pulse" cx="120" cy="70" fill="#0052cc" r="4" style={{"animationDelay": "0.5s"}}/>
<circle className="animate-pulse" cx="160" cy="40" fill="#0052cc" r="4" style={{"animationDelay": "1s"}}/>
</svg>
</div>
</div>

<div className="col-span-1 bg-tertiary-fixed rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow group overflow-hidden flex flex-col">
<div className="w-12 h-12 bg-surface rounded-2xl flex items-center justify-center mb-6 shadow-sm">
<span className="material-symbols-outlined text-tertiary-container">calculate</span>
</div>
<h3 className="font-headline-md text-headline-md text-on-tertiary-fixed mb-3">Payroll 1-Klik</h3>
<p className="font-body-md text-body-md text-on-tertiary-fixed-variant mb-6 flex-grow">Kalkulasi gaji, pajak, dan BPJS otomatis terintegrasi dengan data kehadiran.</p>
<div className="h-32 bg-surface/50 rounded-xl mt-auto overflow-hidden flex items-end px-4 gap-2">

<div className="w-1/4 bg-primary h-[40%] rounded-t-md"></div>
<div className="w-1/4 bg-primary h-[70%] rounded-t-md"></div>
<div className="w-1/4 bg-primary h-[50%] rounded-t-md"></div>
<div className="w-1/4 bg-primary h-[90%] rounded-t-md"></div>
</div>
</div>
</div>
</section>


</div></main><footer className="w-full bg-surface-container-low py-xl border-t border-outline-variant"><div className="max-w-[1440px] mx-auto px-margin-desktop flex flex-col md:flex-row justify-between items-center gap-md"><div className="flex items-center gap-xs"><img alt="Stitch HR Logo" className="h-6 w-auto grayscale opacity-50" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBENklGC4hWh4htOsvsclpTJR5i0byjfP286e5dx8Cu8FNjTz21fPHwNuUMWC6jjE7NTmS3Pbp7zJHFkzWhtxb47iwfWYwe2RxKvIWRdJpRzewMNhvbXt33Q6-i_UmNbxVzpcwnbra_4KpHxupm6gDWkI5jpiHkfoG7jpmwRAp-DnoL4-cY5GlkSQwNfj9dxn8jMiFPCdnJaEUHD6-NPyQm_xTJR4UODEQ3T0NBfZIfmO2Ly_euwEva"/><span className="font-label-md text-on-surface-variant">© 2024 Stitch HR. All rights reserved.</span></div><div className="flex gap-lg"><a className="text-label-md text-on-surface-variant hover:text-primary" href="#">Privacy</a><a className="text-label-md text-on-surface-variant hover:text-primary" href="#">Terms</a></div></div></footer>
    </>
  );
};

export default LandingPage;
