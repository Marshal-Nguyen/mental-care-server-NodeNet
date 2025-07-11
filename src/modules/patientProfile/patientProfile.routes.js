const express = require('express');
const router = express.Router();
const patientProfileController = require('./patientProfile.controller');

router.get('/patient-profiles', patientProfileController.getAllPatientProfiles);
router.get('/patient-profiles/search', patientProfileController.searchPatientProfilesByName);
router.get('/patient-profiles/:id', patientProfileController.getPatientProfileById);
router.post('/patient-profiles', patientProfileController.createPatientProfile);
router.put('/patient-profiles/:id', patientProfileController.updatePatientProfile);
router.delete('/patient-profiles/:id', patientProfileController.deletePatientProfile);
router.get('/patient-statistics', patientProfileController.getPatientStatistics); // Thêm endpoint mới

module.exports = router;