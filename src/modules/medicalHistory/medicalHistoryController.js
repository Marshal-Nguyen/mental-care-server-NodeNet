const medicalHistoryService = require('./medicalHistoryService');

exports.createMedicalHistory = async (req, res) => {
    const { patientId, description, diagnosedAt, createdBy, lastModifiedBy, physicalSymptoms, specificMentalDisorders } = req.body;
    console.log('Request body:', req.body);
    if (!patientId) return res.status(400).json({ error: 'patientId is required' });
    try {
        const result = await medicalHistoryService.createMedicalHistory({ patientId, description, diagnosedAt, createdBy, lastModifiedBy, physicalSymptoms, specificMentalDisorders });
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.getMedicalHistory = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await medicalHistoryService.getMedicalHistory(id);
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
};

exports.getMedicalHistoriesByPatientId = async (req, res) => {
    const { patientId } = req.params;
    try {
        const result = await medicalHistoryService.getMedicalHistoriesByPatientId(patientId);
        res.status(200).json(result);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
};

exports.updateMedicalHistory = async (req, res) => {
    const { id } = req.params;
    const { patientId, description, diagnosedAt, lastModifiedBy, physicalSymptoms, specificMentalDisorders } = req.body;
    if (!patientId) return res.status(400).json({ error: 'patientId is required' });
    try {
        const result = await medicalHistoryService.updateMedicalHistory(id, { patientId, description, diagnosedAt, lastModifiedBy, physicalSymptoms, specificMentalDisorders });
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.updateMedicalHistoriesByPatientId = async (req, res) => {
    const { patientId } = req.params;
    const { description, diagnosedAt, lastModifiedBy, physicalSymptoms, specificMentalDisorders } = req.body;
    try {
        const result = await medicalHistoryService.updateMedicalHistoriesByPatientId(patientId, { description, diagnosedAt, lastModifiedBy, physicalSymptoms, specificMentalDisorders });
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.deleteMedicalHistory = async (req, res) => {
    const { id } = req.params;
    try {
        await medicalHistoryService.deleteMedicalHistory(id);
        res.status(204).send();
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
};