const xlsx = require('xlsx');

const workbook = xlsx.readFile('C:\\Users\\KRAVEN\\Documents\\DGN\\project\\HRIS - Copy\\tabel user.xlsx');
const sheet_name_list = workbook.SheetNames;
const xlData = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);

const levels = new Set();
const jabatans = new Set();
const departments = new Set();
const perusahaan = new Set();
const statusKaryawan = new Set();

xlData.forEach(row => {
    if (row['LEVEL']) levels.add(row['LEVEL'].toString().trim());
    if (row['JABATAN']) jabatans.add(row['JABATAN'].toString().trim());
    if (row['DEPARTMENT']) departments.add(row['DEPARTMENT'].toString().trim());
    if (row['PERUSAHAAN']) perusahaan.add(row['PERUSAHAAN'].toString().trim());
    if (row['STATUS KARYAWAN']) statusKaryawan.add(row['STATUS KARYAWAN'].toString().trim());
});

console.log('Levels:', Array.from(levels).sort());
console.log('Jabatans:', Array.from(jabatans).sort());
console.log('Departments:', Array.from(departments).sort());
console.log('Perusahaan:', Array.from(perusahaan).sort());
console.log('Status Karyawan:', Array.from(statusKaryawan).sort());
