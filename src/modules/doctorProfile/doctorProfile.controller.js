const doctorProfileService = require('./doctorProfile.service');

exports.getAllDoctorProfiles = async (req, res) => {
    try {
        const pageIndex = parseInt(req.query.pageIndex) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const specialtiesId = req.query.Specialties || null;
        const result = await doctorProfileService.getAllDoctorProfiles(pageIndex, pageSize, specialtiesId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getDoctorProfileById = async (req, res) => {
    try {
        const { id } = req.params;
        const doctorProfile = await doctorProfileService.getDoctorProfileById(id);
        res.json(doctorProfile);
    } catch (error) {
        if (error.message === 'Bác sĩ không tồn tại') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};

exports.getAllSpecialties = async (req, res) => {
    try {
        const specialties = await doctorProfileService.getAllSpecialties();
        res.json(specialties);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createDoctorProfile = async (req, res) => {
    try {
        const profileData = req.body;
        const doctorProfile = await doctorProfileService.createDoctorProfile(profileData);
        res.status(201).json(doctorProfile);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateDoctorProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const profileData = req.body;
        const doctorProfile = await doctorProfileService.updateDoctorProfile(id, profileData);
        res.json(doctorProfile);
    } catch (error) {
        if (error.message === 'Bác sĩ không tồn tại') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};

exports.deleteDoctorProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedProfile = await doctorProfileService.deleteDoctorProfile(id);
        res.json(deletedProfile);
    } catch (error) {
        if (error.message === 'Bác sĩ không tồn tại') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};