const express = require('express');
const router = express.Router();
const medicalRecordController = require('./medicalRecordController');

router.post('/', medicalRecordController.createMedicalRecord);
router.get('/:id', medicalRecordController.getMedicalRecord);
router.put('/:id', medicalRecordController.updateMedicalRecord);
router.delete('/:id', medicalRecordController.deleteMedicalRecord);

module.exports = router;