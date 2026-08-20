const XLSX = require('xlsx');

// Export Array of Objects to Excel Buffer
exports.exportToExcelBuffer = (data, sheetName = 'Data') => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};
