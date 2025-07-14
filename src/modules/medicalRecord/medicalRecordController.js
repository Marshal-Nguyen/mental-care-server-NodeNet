const medicalRecordService = require('./medicalRecordService');

exports.createMedicalRecord = async (req, res) => {
    const { patientProfileId, medicalHistoryId, status, createdBy, lastModifiedBy } = req.body;
    const doctorProfileId = req.body.doctorProfileId; // Lấy từ body thay vì req.user
    if (!doctorProfileId) return res.status(400).json({ error: 'doctorProfileId is required' });
    try {
        const result = await medicalRecordService.createMedicalRecord({ patientProfileId, doctorProfileId, medicalHistoryId, status, createdBy, lastModifiedBy });
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.getMedicalRecord = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await medicalRecordService.getMedicalRecord(id);
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
};

exports.updateMedicalRecord = async (req, res) => {
    const { id } = req.params;
    const { patientProfileId, doctorProfileId, medicalHistoryId, status, lastModifiedBy } = req.body;
    if (!doctorProfileId) return res.status(400).json({ error: 'doctorProfileId is required' });
    try {
        const result = await medicalRecordService.updateMedicalRecord(id, { patientProfileId, doctorProfileId, medicalHistoryId, status, lastModifiedBy });
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.deleteMedicalRecord = async (req, res) => {
    const { id } = req.params;
    try {
        await medicalRecordService.deleteMedicalRecord(id);
        res.status(204).send();
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
};