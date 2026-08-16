const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'controllers', 'authController.js');
let content = fs.readFileSync(targetFile, 'utf8');

// Insert flattenUser helper if it doesn't exist
if (!content.includes('flattenUser')) {
    const flattenHelper = `
// Helper to flatten populated user document
const flattenUser = (user) => {
    const u = user.toObject ? user.toObject() : user;
    const result = { ...u, id: u._id ? u._id.toString() : u.id };
    if (u.employeeDetail) { Object.assign(result, u.employeeDetail); delete result.employeeDetail; }
    if (u.employmentRecord) { Object.assign(result, u.employmentRecord); delete result.employmentRecord; }
    if (u.employeeDocument) { Object.assign(result, u.employeeDocument); delete result.employeeDocument; }
    return result;
};
`;
    content = content.replace("const ADMIN_KEY = process.env.SECRET_KEY_ADMIN;", "const ADMIN_KEY = process.env.SECRET_KEY_ADMIN;\n" + flattenHelper);
}

// Update login
content = content.replace(
    /const userObj = user\.toObject\(\);\s*delete userObj\.password;\s*\/\/\s*Alias _id to id for frontend compatibility\s*userObj\.id = userObj\._id\.toString\(\);/,
    `await user.populate('employeeDetail');
        await user.populate('employmentRecord');
        await user.populate('employeeDocument');
        const userObj = flattenUser(user);
        delete userObj.password;`
);

// Update getProfile
content = content.replace(
    /const user = await User\.findById\(req\.userId\)\.select\('-password'\);[\s\S]*?res\.json\(userObj\);/,
    `const user = await User.findById(req.userId)
            .populate('employeeDetail')
            .populate('employmentRecord')
            .populate('employeeDocument')
            .select('-password');
        if (!user) return res.status(404).json({ message: "User not found" });
        
        res.json(flattenUser(user));`
);

// Update getAllUsers
content = content.replace(
    /const users = await User\.find\(query\)\.skip\(skip\)\.limit\(parseInt\(limit\)\)\.select\('-password'\);/,
    `const users = await User.find(query)
            .populate('employeeDetail')
            .populate('employmentRecord')
            .populate('employeeDocument')
            .skip(skip).limit(parseInt(limit)).select('-password');`
);
content = content.replace(
    /data: users\.map\(u => \(\{ \.\.\.u\.toObject\(\), id: u\._id\.toString\(\) \}\)\),/,
    `data: users.map(flattenUser),`
);

fs.writeFileSync(targetFile, content);
console.log("authController.js updated successfully");
