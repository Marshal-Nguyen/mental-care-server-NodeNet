const express = require('express');
const router = express.Router();
const doctorProfileController = require('./doctorProfile.controller');
const { authMiddleware, restrictTo } = require('../../middlewares/auth.middleware');

router.get('/doctor-profiles', doctorProfileController.getAllDoctorProfiles);
// router.get('/doctor-profiles', authMiddleware, restrictTo('Doctor'), doctorProfileController.getAllDoctorProfiles);
router.get('/doctor-profiles/search', doctorProfileController.searchDoctorProfilesByName); // Thêm endpoint tìm kiếm
router.get('/doctor-profiles/:id', doctorProfileController.getDoctorProfileById);
router.get('/specialties', doctorProfileController.getAllSpecialties);


router.post('/doctor-profiles', doctorProfileController.createDoctorProfile);
router.put('/doctor-profiles/:id', doctorProfileController.updateDoctorProfile);
router.delete('/doctor-profiles/:id', doctorProfileController.deleteDoctorProfile);
// router.post('/doctor-profiles', authMiddleware, restrictTo('Doctor', 'Manager'), doctorProfileController.createDoctorProfile);
// router.put('/doctor-profiles/:id', authMiddleware, restrictTo('Doctor', 'Manager'), doctorProfileController.updateDoctorProfile);
// router.delete('/doctor-profiles/:id', authMiddleware, restrictTo('Doctor', 'Manager'), doctorProfileController.deleteDoctorProfile);

module.exports = router;