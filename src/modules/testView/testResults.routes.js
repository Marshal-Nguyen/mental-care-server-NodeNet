const express = require('express');
const router = express.Router();
const testResultsController = require('./testResults.controller');

router.get('/test-view/statistics', testResultsController.getStatistics);
router.get('/test-view/view', testResultsController.getTestResults);
router.get('/test-view/trends', testResultsController.getTrends);
router.get('/test-view/severity-by-patient', testResultsController.getSeverityByPatient);
router.get('/test-view/patient/:patientId', testResultsController.getPatientTestDetails);

module.exports = router;