const express = require('express');
const router = express.Router();
const medicalRecordController = require('./medicalRecordController');

router.post('/medical-records', medicalRecordController.createMedicalRecord);
router.get('/:id', medicalRecordController.getMedicalRecord);
router.get('/medical-records/:patientId', medicalRecordController.getMedicalRecordsByPatientId);
router.get('/medical-records/doctor/:doctorId', medicalRecordController.getMedicalRecordsByDoctorId);
router.put('/:id', medicalRecordController.updateMedicalRecord);
router.put('/medical-records/:patientId', medicalRecordController.updateMedicalRecordsByPatientId);
router.delete('/medical-records/:id', medicalRecordController.deleteMedicalRecord);

module.exports = router;