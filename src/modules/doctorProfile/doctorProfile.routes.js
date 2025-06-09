const express = require('express');
const router = express.Router();
const doctorProfileController = require('./doctorProfile.controller');

router.get('/doctor-profiles', doctorProfileController.getAllDoctorProfiles);
router.get('/doctor-profiles/:id', doctorProfileController.getDoctorProfileById);
router.post('/doctor-profiles', doctorProfileController.createDoctorProfile);
router.put('/doctor-profiles/:id', doctorProfileController.updateDoctorProfile);
router.delete('/doctor-profiles/:id', doctorProfileController.deleteDoctorProfile);

module.exports = router;