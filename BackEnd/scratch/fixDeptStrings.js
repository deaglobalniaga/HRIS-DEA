const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'controllers', 'employeeController.js');
let content = fs.readFileSync(targetFile, 'utf8');

const transformLogic = `
        // Map string department to ObjectId
        if (updates.department && !mongoose.Types.ObjectId.isValid(updates.department)) {
            const Department = require('../models/Department');
            let dynDept = await Department.findOne({ name: { $regex: new RegExp(\`^\${updates.department}\$\`, 'i') } });
            if (!dynDept) {
                dynDept = new Department({ name: updates.department, description: \`Divisi \${updates.department}\` });
                await dynDept.save();
            }
            updates.department = dynDept._id;
        }
`;

// Insert into put_employees
content = content.replace(
    'if (updates.role && req.userRole !== \'superadmin\') {',
    `${transformLogic}\n\n        if (updates.role && req.userRole !== 'superadmin') {`
);

// Insert into post_employees
content = content.replace(
    'const rawPassword = payload.password || \'password123\';',
    `
        // Map string department to ObjectId
        if (payload.department && !mongoose.Types.ObjectId.isValid(payload.department)) {
            const Department = require('../models/Department');
            let dynDept = await Department.findOne({ name: { $regex: new RegExp(\`^\${payload.department}\$\`, 'i') } });
            if (!dynDept) {
                dynDept = new Department({ name: payload.department, description: \`Divisi \${payload.department}\` });
                await dynDept.save();
            }
            payload.department = dynDept._id;
        }
        
        const rawPassword = payload.password || 'password123';`
);

fs.writeFileSync(targetFile, content);
console.log('employeeController patched to map string departments to objectid');
