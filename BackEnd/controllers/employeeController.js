const supabase = require('../config/supabaseClient');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

exports.get_employees = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, full_name, email, username, nik_internal, role, division, profile_photo_url, last_activity, date_of_joining, base_salary')
            .order('full_name', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET Departments (Dynamically aggregated from users table)
exports.get_departments = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('full_name, role, division')
            .not('division', 'is', null);

        if (error) throw error;

        // Aggregate by division
        const deptMap = {};
        data.forEach(user => {
            const div = user.division || 'Unassigned';
            if (!deptMap[div]) {
                deptMap[div] = { name: div, head: '-', employees: 0, status: 'Active' };
            }
            deptMap[div].employees += 1;
            
            // Assign head if admin or pjo
            if (user.role === 'admin' || user.role === 'pjo' || user.role === 'hr') {
                if (deptMap[div].head === '-') deptMap[div].head = user.full_name;
            }
        });

        // If a division has no head assigned by role, just pick the first person or leave as '-'
        const departments = Object.keys(deptMap).map((key, idx) => ({
            id: String(idx + 1),
            ...deptMap[key]
        }));

        res.json(departments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.set_department_head = async (req, res) => {
    try {
        const { divisionName, newHeadId } = req.body;
        
        // 1. Demote current heads in this division (pjo only, don't demote admin)
        const { data: currentHeads } = await supabase
            .from('users')
            .select('id')
            .eq('division', divisionName)
            .eq('role', 'pjo');
            
        if (currentHeads && currentHeads.length > 0) {
            for (let head of currentHeads) {
                await supabase.from('users').update({ role: 'user' }).eq('id', head.id);
            }
        }
        
        // 2. Promote new head
        if (newHeadId) {
            await supabase.from('users').update({ role: 'pjo' }).eq('id', newHeadId);
        }
        
        res.json({ success: true, message: "Kepala divisi berhasil diubah" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.post_employees = async (req, res) => {
    try {
        const { full_name, email, role, division, date_of_joining, nik_internal, contract_type, employment_status, job_title, nik_ktp, phone_number, initial_work_days } = req.body;
        
        let targetEmail = email || `${nik_internal.toLowerCase()}@hris.local`;
        const authId = crypto.randomUUID();
        const hashedPassword = await bcrypt.hash(nik_internal, 10);

        const { data, error } = await supabase
            .from('users')
            .insert([{
                id: authId,
                username: targetEmail,
                email: targetEmail,
                password: hashedPassword,
                full_name,
                role: role || 'user',
                division,
                date_of_joining,
                nik_internal,
                contract_type,
                employment_status: employment_status || 'Tetap',
                job_title,
                nik_ktp,
                phone_number,
                initial_work_days: initial_work_days || 0
            }]);

        if (error) throw error;
        
        try {
            const { notifyAdmins } = require('./notificationController');
            await notifyAdmins(
                'Data Karyawan Baru',
                `Karyawan baru ditambahkan: ${full_name} (${role}) di divisi ${division}`,
                'user',
                '/organization'
            );
        } catch (e) { console.error('Failed to notify admins on employee creation:', e); }

        res.status(201).json({ message: 'Employee added successfully', data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.put_employees = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            full_name, role, division, job_title, contract_type, employment_status, initial_work_days, profile_photo_url,
            email, phone_number, nik_ktp, address, emergency_contact, blood_type, marital_status
        } = req.body;
        
        const updateData = {};
        if (full_name !== undefined) updateData.full_name = full_name;
        if (role !== undefined) updateData.role = role;
        if (division !== undefined) updateData.division = division;
        if (job_title !== undefined) updateData.job_title = job_title;
        if (contract_type !== undefined) updateData.contract_type = contract_type;
        if (employment_status !== undefined) updateData.employment_status = employment_status;
        if (initial_work_days !== undefined) updateData.initial_work_days = initial_work_days;
        if (profile_photo_url !== undefined) updateData.profile_photo_url = profile_photo_url;
        if (email !== undefined) updateData.email = email;
        if (phone_number !== undefined) updateData.phone_number = phone_number;
        if (nik_ktp !== undefined) updateData.nik_ktp = nik_ktp;
        if (address !== undefined) updateData.address = address;
        if (emergency_contact !== undefined) updateData.emergency_contact = emergency_contact;
        if (blood_type !== undefined) updateData.blood_type = blood_type;
        if (marital_status !== undefined) updateData.marital_status = marital_status;

        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Employee updated successfully', data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.post_employees_bulk = async (req, res) => {
    try {
        const { employees } = req.body;
        if (!employees || !Array.isArray(employees)) {
            return res.status(400).json({ error: 'Invalid payload' });
        }

        const insertData = [];

        for (const emp of employees) {
            if (!emp.nik_internal) continue; // skip if no NIK

            let targetEmail = emp.email || `${emp.nik_internal.toLowerCase()}@hris.local`;
            
            // Hash the password (using NIK as default password)
            const hashedPassword = await bcrypt.hash(emp.nik_internal, 10);

            insertData.push({
                username: targetEmail,
                email: targetEmail,
                password: hashedPassword,
                full_name: emp.full_name,
                role: emp.role || 'user',
                division: emp.division,
                date_of_joining: emp.date_of_joining,
                nik_internal: emp.nik_internal,
                contract_type: emp.contract_type,
                employment_status: emp.employment_status || 'Tetap',
                job_title: emp.job_title,
                nik_ktp: emp.nik_ktp,
                phone_number: emp.phone_number
            });
        }

        if (insertData.length > 0) {
            const { data, error } = await supabase.from('users').insert(insertData);
            if (error) throw error;
            res.status(201).json({ message: `Employees added successfully`, count: insertData.length });
        } else {
            res.status(400).json({ error: 'Failed to process bulk import. Check for duplicate NIK/Emails.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.update_profile = async (req, res) => {
    try {
        const { phone_number, address, birth_date, profile_photo_url } = req.body;
        const updateData = {};
        
        if (phone_number !== undefined) updateData.phone_number = phone_number;
        if (address !== undefined) updateData.address = address;
        if (birth_date !== undefined) updateData.birth_date = birth_date;
        if (profile_photo_url !== undefined) updateData.profile_photo_url = profile_photo_url;
        
        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', req.userId)
            .select('id, full_name, phone_number, address, birth_date, profile_photo_url');

        if (error) throw error;
        res.json({ message: 'Profile updated successfully', data: data[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
