const express = require('express');
const router = express.Router();
const medicalRecordController = require('./medicalRecordController');
const { authMiddleware, restrictTo } = require('../../middlewares/auth.middleware');

router.post('/medical-records', authMiddleware, restrictTo('Doctor', 'User', 'Manager'), medicalRecordController.createMedicalRecord);
router.get('/:id', authMiddleware, restrictTo('Doctor', 'User', 'Manager'), medicalRecordController.getMedicalRecord);
router.get('/medical-records/:patientId', authMiddleware, restrictTo('Doctor', 'User', 'Manager'), medicalRecordController.getMedicalRecordsByPatientId);
router.get('/medical-records/doctor/:doctorId', authMiddleware, restrictTo('Doctor', 'User', 'Manager'), medicalRecordController.getMedicalRecordsByDoctorId);
router.put('/:id', authMiddleware, restrictTo('Doctor', 'User', 'Manager'), medicalRecordController.updateMedicalRecord);
router.put('/medical-records/:patientId', authMiddleware, restrictTo('Doctor', 'User', 'Manager'), medicalRecordController.updateMedicalRecordsByPatientId);
router.delete('/medical-records/:id', authMiddleware, restrictTo('Doctor', 'User', 'Manager'), medicalRecordController.deleteMedicalRecord);

module.exports = router;