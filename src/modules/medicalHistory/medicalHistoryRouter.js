const express = require('express');
const router = express.Router();
const medicalHistoryController = require('./medicalHistoryController');

router.post('/medical-histories', medicalHistoryController.createMedicalHistory);
router.get('/medical-histories/:id', medicalHistoryController.getMedicalHistory);
router.get('/medical-histories/patient/:patientId', medicalHistoryController.getMedicalHistoriesByPatientId);
router.put('/medical-histories/:id', medicalHistoryController.updateMedicalHistory);
router.put('/medical-histories/patient/:patientId', medicalHistoryController.updateMedicalHistoriesByPatientId);
router.delete('/medical-histories/:id', medicalHistoryController.deleteMedicalHistory);

module.exports = router;