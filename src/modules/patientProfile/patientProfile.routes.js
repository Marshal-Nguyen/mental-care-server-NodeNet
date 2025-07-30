const express = require('express');
const router = express.Router();
const patientProfileController = require('./patientProfile.controller');
const { authMiddleware, restrictTo } = require('../../middlewares/auth.middleware');

// router.get('/patient-profiles', patientProfileController.getAllPatientProfiles);
router.get('/patient-profiles', authMiddleware, restrictTo('Doctor', 'User', 'Manager'), patientProfileController.getAllPatientProfiles);
router.get('/patient-profiles/search', authMiddleware, restrictTo('Doctor', 'User', 'Manager'), patientProfileController.searchPatientProfilesByName);
router.get(
  "/patient-profiles/:id",
  authMiddleware,
  restrictTo("Doctor", "User", "Manager"),
  patientProfileController.getPatientProfileById
);
router.post('/patient-profiles', authMiddleware, restrictTo('User', 'Manager'), patientProfileController.createPatientProfile);
router.put('/patient-profiles/:id', authMiddleware, restrictTo('Doctor', 'User', 'Manager'), patientProfileController.updatePatientProfile);
router.delete('/patient-profiles/:id', authMiddleware, restrictTo('Manager'), patientProfileController.deletePatientProfile);
router.get('/patient-statistics', patientProfileController.getPatientStatistics);
// router.get('/patient-statistics', authMiddleware, restrictTo('Manager'), patientProfileController.getPatientStatistics);

module.exports = router;