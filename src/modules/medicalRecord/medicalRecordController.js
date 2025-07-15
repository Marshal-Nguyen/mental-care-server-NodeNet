const medicalRecordService = require('./medicalRecordService');

exports.createMedicalRecord = async (req, res) => {
    try {
        const result = await medicalRecordService.createMedicalRecord(req.body);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.getMedicalRecord = async (req, res) => {
    try {
        const result = await medicalRecordService.getMedicalRecord(req.params.id);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.getMedicalRecordsByPatientId = async (req, res) => {
    try {
        const result = await medicalRecordService.getMedicalRecordsByPatientId(req.params.patientId);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.updateMedicalRecord = async (req, res) => {
    try {
        const result = await medicalRecordService.updateMedicalRecord(req.params.id, req.body);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.updateMedicalRecordsByPatientId = async (req, res) => {
    try {
        const result = await medicalRecordService.updateMedicalRecordsByPatientId(req.params.patientId, req.body);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.deleteMedicalRecord = async (req, res) => {
    try {
        await medicalRecordService.deleteMedicalRecord(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};