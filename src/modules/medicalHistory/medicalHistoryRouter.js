const express = require('express');
const router = express.Router();
const medicalHistoryController = require('./medicalHistoryController');
const { authMiddleware, restrictTo } = require('../../middlewares/auth.middleware');

router.post('/medical-histories', authMiddleware, restrictTo('Doctor', 'User', 'Manager'), medicalHistoryController.createMedicalHistory);
router.get('/medical-histories/:id', authMiddleware, restrictTo('Doctor', 'User', 'Manager'), medicalHistoryController.getMedicalHistory);
router.get('/medical-histories/patient/:patientId', authMiddleware, restrictTo('Doctor', 'User', 'Manager'), medicalHistoryController.getMedicalHistoriesByPatientId);
router.put('/medical-histories/:id', authMiddleware, restrictTo('Doctor', 'User', 'Manager'), medicalHistoryController.updateMedicalHistory);
router.put('/medical-histories/patient/:patientId', authMiddleware, restrictTo('Doctor', 'User', 'Manager'), medicalHistoryController.updateMedicalHistoriesByPatientId);
router.delete('/medical-histories/:id', authMiddleware, restrictTo('Doctor', 'User', 'Manager'), medicalHistoryController.deleteMedicalHistory);

module.exports = router;