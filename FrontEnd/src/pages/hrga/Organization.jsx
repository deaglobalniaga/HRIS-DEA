import React, { useState } from 'react';
import { Users, Briefcase, Shield, Building, Award, ShieldCheck, Scan } from 'lucide-react';
import Employees from './Employees';
import Departments from './Departments';
import AccessRights from '../superadmin/AccessRights';
import CompanySettings from '../superadmin/CompanySettings';
import Certifications from '../hse/Certifications';
import FaceEnrollmentTab from '../../components/common/FaceEnrollmentTab';
import { useAuth } from '../../context/AuthContext';

const Organization = () => {
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const dept = (user?.department || user?.department_name || user?.departments?.name || '').toLowerCase();
  const jabatan = (user?.jabatan || '').toLowerCase();
  const username = (user?.username || '').toLowerCase();

  const isSuperAdmin = ['superadmin', 'super_admin', 'super admin'].includes(role);
  const isAdmin = ['admin', 'hrga_admin', 'hr', 'hse_admin'].includes(role) || (role.includes('admin') && !isSuperAdmin);
  const isHSEAdmin = role === 'hse_admin' || (
    isAdmin && (
      dept.includes('hse') || dept.includes('k3') || dept.includes('safety') || dept.includes('pengelola k3') ||
      jabatan.includes('hse') || jabatan.includes('k3') || jabatan.includes('safety') ||
      username.includes('hse')
    )
  );

  // HSE Direct View: Matriks Sertifikasi K3
  if (isHSEAdmin) {
    return (
      <div className="flex flex-col w-full h-full bg-slate-50 p-1">
        <div className="mb-4">
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Award className="text-red-700" size={24} /> Matriks Sertifikasi K3 & Kompetensi
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Monitoring masa berlaku sertifikat K3 (POP, POM, WAH, AK3U, CSMS) seluruh personel PT DEA GLOBAL NIAGA.
          </p>
        </div>
        <Certifications />
      </div>
    );
  }

  // Default active tab based on role
  const getDefaultTab = () => {
    if (isSuperAdmin) return 'company';
    return 'employees';
  };

  const [activeTab, setActiveTab] = useState(getDefaultTab());

  return (
    <div className="flex flex-col w-full h-full bg-slate-50">
      <div className="mb-6 px-1 flex flex-col md:flex-row justify-start items-start md:items-center gap-4">
        {/* Tab Navigation */}
        <div className="flex flex-wrap bg-white rounded-xl shadow-sm border border-slate-200 p-1">
          {/* Admin only tabs */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('employees')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'employees' ? 'bg-red-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Users size={16} /> Karyawan
            </button>
          )}

          {/* Departemen: Full edit for Admin, Read-Only for Superadmin */}
          {(isAdmin || isSuperAdmin) && (
            <button
              onClick={() => setActiveTab('departments')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'departments' ? 'bg-red-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Briefcase size={16} /> Departemen & Jabatan {isSuperAdmin && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded ml-1 font-bold">Read-Only</span>}
            </button>
          )}

          {/* Data Wajah Karyawan (Biometrik Wajah AI) */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('face_biometrics')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'face_biometrics' ? 'bg-red-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Scan size={16} /> Data Wajah Karyawan
            </button>
          )}

          {/* Hak Akses & Role tab */}
          {(isAdmin || isSuperAdmin) && (
            <button
              onClick={() => setActiveTab('permissions')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'permissions' ? 'bg-red-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Shield size={16} /> Hak Akses & Role
            </button>
          )}

          {/* Profil Perusahaan (Master - Only Super Admin) */}
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('company')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'company' ? 'bg-red-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Building size={16} /> Profil Perusahaan <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded ml-1 font-bold">Master</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 w-full animate-in fade-in duration-300">
        {activeTab === 'employees' && isAdmin && <Employees />}
        {activeTab === 'departments' && <Departments readOnly={isSuperAdmin} />}
        {activeTab === 'face_biometrics' && isAdmin && <FaceEnrollmentTab />}
        {activeTab === 'permissions' && (isAdmin || isSuperAdmin) && <AccessRights />}
        {activeTab === 'company' && <CompanySettings />}
      </div>
    </div>
  );
};

export default Organization;
