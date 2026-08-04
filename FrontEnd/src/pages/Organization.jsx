import React, { useState } from 'react';
import { Users, Briefcase } from 'lucide-react';
import Employees from './Employees';
import Departments from './Departments';

const Organization = () => {
  const [activeTab, setActiveTab] = useState('employees');

  return (
    <div className="flex flex-col w-full h-full bg-slate-50">
      <div className="mb-6 px-1 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1">
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
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'employees' && <div className="w-full h-full -mt-6"><Employees /></div>}
        {activeTab === 'departments' && <div className="w-full h-full -mt-6"><Departments /></div>}
      </div>
    </div>
  );
};

export default Organization;
