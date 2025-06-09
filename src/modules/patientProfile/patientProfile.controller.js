const patientProfileService = require('./patientProfile.service');

exports.getAllPatientProfiles = async (req, res) => {
    try {
        const pageIndex = parseInt(req.query.pageIndex) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const result = await patientProfileService.getAllPatientProfiles(pageIndex, pageSize);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getPatientProfileById = async (req, res) => {
    try {
        const { id } = req.params;
        const patientProfile = await patientProfileService.getPatientProfileById(id);
        res.json(patientProfile);
    } catch (error) {
        if (error.message === 'Bệnh nhân không tồn tại') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};

exports.createPatientProfile = async (req, res) => {
    try {
        const profileData = req.body;
        const patientProfile = await patientProfileService.createPatientProfile(profileData);
        res.status(201).json(patientProfile);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updatePatientProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const profileData = req.body;
        const patientProfile = await patientProfileService.updatePatientProfile(id, profileData);
        res.json(patientProfile);
    } catch (error) {
        if (error.message === 'Bệnh nhân không tồn tại') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};

exports.deletePatientProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedProfile = await patientProfileService.deletePatientProfile(id);
        res.json(deletedProfile);
    } catch (error) {
        if (error.message === 'Bệnh nhân không tồn tại') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};