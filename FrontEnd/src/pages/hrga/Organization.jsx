import React from 'react';
import { useSearchParams } from 'react-router-dom';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const role = (user?.role || '').toLowerCase();
  const dept = (user?.department || user?.department_name || user?.departments?.name || '').toLowerCase();
  const jabatan = (user?.jabatan || '').toLowerCase();
  const username = (user?.username || '').toLowerCase();

  const isSuperAdmin = ['superadmin', 'super_admin', 'super admin'].includes(role);
  const isHSEAdmin = role === 'hse_admin' || role.includes('hse') || dept.includes('hse') || dept.includes('k3') || dept.includes('safety') || jabatan.includes('hse') || username.includes('hse');
  // Superadmin is strictly excluded from operational admin (employees, certificates, face data)
  const isAdmin = !isSuperAdmin && (['admin', 'hrga_admin', 'hr', 'hse_admin', 'hse', 'hse_officer'].includes(role) || role.includes('admin') || role.includes('hr') || isHSEAdmin);

  // Derive activeTab directly from searchParams (safe and synchronized)
  const tabParam = searchParams.get('tab');
  const activeTab = (isSuperAdmin && ['employees', 'certifications', 'face_biometrics'].includes(tabParam))
    ? 'company'
    : (tabParam || (isSuperAdmin ? 'company' : isHSEAdmin ? 'certifications' : 'employees'));

  const handleTabChange = (tabName) => {
    setSearchParams({ tab: tabName });
  };

  return (
    <div className="flex flex-col w-full h-full space-y-4">
      {/* Sleek Floating Acrylic Glass Tab Navigation */}
      <div className="flex flex-col md:flex-row justify-start items-start md:items-center gap-4">
        <div className="flex flex-wrap bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 ring-1 ring-slate-900/5 p-1.5 gap-1.5">
          {/* Admin only tabs (HRGA & HSE) */}
          {isAdmin && (
            <button
              onClick={() => handleTabChange('employees')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'employees'
                  ? 'bg-gradient-to-r from-red-700 to-rose-700 text-white shadow-md shadow-red-900/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Users size={15} /> Karyawan
            </button>
          )}

          {/* Matriks Sertifikasi K3 & Lisensi (HRGA & HSE) */}
          {isAdmin && (
            <button
              onClick={() => handleTabChange('certifications')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'certifications'
                  ? 'bg-gradient-to-r from-red-700 to-rose-700 text-white shadow-md shadow-red-900/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Award size={15} /> Sertifikasi & Lisensi K3
            </button>
          )}

          {/* Departemen & Struktur Organisasi: Full edit for HRGA & HSE Admin */}
          {(isAdmin || isSuperAdmin) && (
            <button
              onClick={() => handleTabChange('departments')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'departments'
                  ? 'bg-gradient-to-r from-red-700 to-rose-700 text-white shadow-md shadow-red-900/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Briefcase size={15} /> Departemen & Jabatan {isSuperAdmin && <span className="text-[10px] bg-slate-100/80 text-slate-500 px-1.5 py-0.5 rounded-md ml-1 font-bold">Read-Only</span>}
            </button>
          )}

          {/* Data Wajah Karyawan (Biometrik Wajah AI) */}
          {isAdmin && (
            <button
              onClick={() => handleTabChange('face_biometrics')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'face_biometrics'
                  ? 'bg-gradient-to-r from-red-700 to-rose-700 text-white shadow-md shadow-red-900/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Scan size={15} /> Data Wajah Karyawan {isHSEAdmin && <span className="text-[10px] bg-slate-100/80 text-slate-500 px-1.5 py-0.5 rounded-md ml-1 font-bold">Read-Only</span>}
            </button>
          )}

          {/* Hak Akses & Role tab */}
          {(isAdmin || isSuperAdmin) && (
            <button
              onClick={() => handleTabChange('permissions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'permissions'
                  ? 'bg-gradient-to-r from-red-700 to-rose-700 text-white shadow-md shadow-red-900/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Shield size={15} /> Hak Akses & Role {isHSEAdmin && <span className="text-[10px] bg-slate-100/80 text-slate-500 px-1.5 py-0.5 rounded-md ml-1 font-bold">Read-Only</span>}
            </button>
          )}

          {/* Profil Perusahaan (Master - Only Super Admin) */}
          {isSuperAdmin && (
            <button
              onClick={() => handleTabChange('company')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'company'
                  ? 'bg-gradient-to-r from-red-700 to-rose-700 text-white shadow-md shadow-red-900/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Building size={15} /> Profil Perusahaan <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-md ml-1 font-bold">Master</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 w-full animate-in fade-in duration-300">
        {activeTab === 'employees' && !isSuperAdmin && isAdmin && <Employees readOnly={isHSEAdmin} />}
        {activeTab === 'certifications' && !isSuperAdmin && isAdmin && <Certifications />}
        {activeTab === 'departments' && <Departments readOnly={isSuperAdmin} />}
        {activeTab === 'face_biometrics' && !isSuperAdmin && isAdmin && <FaceEnrollmentTab readOnly={isHSEAdmin} />}
        {activeTab === 'permissions' && (isAdmin || isSuperAdmin) && <AccessRights readOnly={isHSEAdmin} />}
        {activeTab === 'company' && isSuperAdmin && <CompanySettings />}
      </div>
    </div>
  );
};

export default Organization;
