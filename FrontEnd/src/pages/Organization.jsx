import React, { useState } from 'react';
import { Users, Briefcase, Shield, Building, Award } from 'lucide-react';
import Employees from './Employees';
import Departments from './Departments';
import AccessRights from './AccessRights';
import CompanySettings from './CompanySettings';
import Certifications from './Certifications';
import { useAuth } from '../context/AuthContext';

const Organization = () => {
  const [activeTab, setActiveTab] = useState('employees');
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.role?.toLowerCase().includes('superadmin');
  const isSuperAdmin = user?.role?.toLowerCase().includes('superadmin');

  return (
    <div className="flex flex-col w-full h-full bg-slate-50">
      <div className="mb-6 px-1 flex flex-col md:flex-row justify-start items-start md:items-center gap-4">
        
        {/* Tab Navigation */}
        <div className="flex flex-wrap bg-white rounded-xl shadow-sm border border-slate-200 p-1">
          <button
            onClick={() => setActiveTab('employees')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'employees' ? 'bg-red-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Users size={16} /> Karyawan
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'departments' ? 'bg-red-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Briefcase size={16} /> Departemen & Jabatan
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('permissions')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'permissions' ? 'bg-red-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Shield size={16} /> Hak Akses
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('company')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'company' ? 'bg-red-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Building size={16} /> Profil Perusahaan
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'employees' && <div className="w-full h-full"><Employees /></div>}
        {activeTab === 'departments' && <div className="w-full h-full"><Departments /></div>}
        {activeTab === 'permissions' && isSuperAdmin && <div className="w-full h-full"><AccessRights /></div>}
        {activeTab === 'company' && isAdmin && <div className="w-full h-full"><CompanySettings /></div>}
      </div>
    </div>
  );
};

export default Organization;
