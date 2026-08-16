const Certification = require('../models/Certification');
const User = require('../models/User');

exports.get_certifications = async (req, res) => {
    try {
        const certifications = await Certification.find().populate('user', 'nama role department');
        res.json(certifications);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.get_user_certifications = async (req, res) => {
    try {
        const { userId } = req.params;
        const certifications = await Certification.find({ user: userId });
        res.json(certifications);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.add_certification = async (req, res) => {
    try {
        const { user_id, nama_sertifikat, institusi_penerbit, tanggal_diterbitkan, tanggal_kadaluarsa } = req.body;
        
        let files = req.files || [];
        // If single file fallback
        if (req.file && files.length === 0) {
            files = [req.file];
        }

        const addedCerts = [];
        
        if (files.length > 0) {
            for (const file of files) {
                const attachment_url = `/uploads/documents/${file.filename}`;
                // Optional: append index to nama_sertifikat if multiple files, or just use the same name
                const certName = files.length > 1 ? `${nama_sertifikat} - ${file.originalname}` : nama_sertifikat;
                
                const newCert = new Certification({
                    user: user_id,
                    nama_sertifikat: certName,
                    institusi_penerbit,
                    tanggal_diterbitkan,
                    tanggal_kadaluarsa,
                    attachment_url
                });
                await newCert.save();
                const populated = await Certification.findById(newCert._id).populate('user', 'nama role department');
                addedCerts.push(populated);
            }
        } else {
            // No file attached
            const newCert = new Certification({
                user: user_id,
                nama_sertifikat,
                institusi_penerbit,
                tanggal_diterbitkan,
                tanggal_kadaluarsa,
                attachment_url: null
            });
            await newCert.save();
            const populated = await Certification.findById(newCert._id).populate('user', 'nama role department');
            addedCerts.push(populated);
        }

        res.status(201).json({ message: 'Sertifikasi berhasil ditambahkan', data: addedCerts });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.delete_certification = async (req, res) => {
    try {
        const { id } = req.params;
        await Certification.findByIdAndDelete(id);
        res.json({ message: 'Sertifikasi berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
