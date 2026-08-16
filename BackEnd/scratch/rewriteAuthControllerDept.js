const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'controllers', 'authController.js');
let content = fs.readFileSync(targetFile, 'utf8');

// Update flattenUser
if (!content.includes('result.department_id = u.department._id;')) {
    content = content.replace(
        'if (u.employeeDocument) {',
        `if (u.department && typeof u.department === 'object') {
        result.department_id = u.department._id;
        result.department = u.department.name;
    }
    if (u.employeeDocument) {`
    );
}

// Populate department in login
content = content.replace(
    'await user.populate(\'employeeDetail\');',
    'await user.populate(\'department\');\n        await user.populate(\'employeeDetail\');'
);

// Populate department in getProfile
content = content.replace(
    'const user = await User.findById(req.user.id).populate(\'employeeDetail\')',
    'const user = await User.findById(req.user.id).populate(\'department\').populate(\'employeeDetail\')'
);

// Populate department in updateProfile
content = content.replace(
    'const user = await User.findById(req.user.id).populate(\'employeeDetail\')',
    'const user = await User.findById(req.user.id).populate(\'department\').populate(\'employeeDetail\')'
);

fs.writeFileSync(targetFile, content);
console.log('authController.js updated successfully for Department model.');
