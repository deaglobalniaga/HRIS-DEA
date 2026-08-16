const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'controllers', 'employeeController.js');
let content = fs.readFileSync(targetFile, 'utf8');

if (!content.includes('const Department = require(\'../models/Department\');')) {
    content = content.replace(
        'const EmployeeDocument = require(\'../models/EmployeeDocument\');',
        'const EmployeeDocument = require(\'../models/EmployeeDocument\');\nconst Department = require(\'../models/Department\');'
    );
}

// Update flattenUser to handle populated department
content = content.replace(
    'if (u.employeeDocument) {',
    `if (u.department && typeof u.department === 'object') {
        result.department_id = u.department._id;
        result.department = u.department.name;
    }
    if (u.employeeDocument) {`
);

// Populate department in get_employees
content = content.replace(
    '.populate(\'employeeDetail\')',
    '.populate(\'department\')\n            .populate(\'employeeDetail\')'
);

// Update get_departments to query Department model directly
const getDepartmentsReplacement = `exports.get_departments = async (req, res) => {
    try {
        const departments = await Department.find();
        
        // Count employees per department
        const users = await User.find({ department: { $ne: null } }).select('nama role department');
        
        const deptMap = {};
        departments.forEach(d => {
            deptMap[d._id.toString()] = { id: d._id, name: d.name, description: d.description, head: '-', employees: 0, status: 'Active' };
        });
        
        users.forEach(user => {
            const divId = user.department ? user.department.toString() : null;
            if (divId && deptMap[divId]) {
                deptMap[divId].employees += 1;
                if (user.role === 'admin' || user.role === 'superadmin') {
                    if (deptMap[divId].head === '-') deptMap[divId].head = user.nama || user.full_name;
                }
            }
        });

        res.json(Object.values(deptMap));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};`;

content = content.replace(/exports\.get_departments = async \(req, res\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ error: err\.message \}\);\s*\}\s*\};/, getDepartmentsReplacement);

fs.writeFileSync(targetFile, content);
console.log('employeeController.js updated successfully for Department model.');
