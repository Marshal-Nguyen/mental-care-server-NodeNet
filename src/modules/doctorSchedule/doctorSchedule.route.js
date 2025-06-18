const express = require('express');
const router = express.Router();
const doctorScheduleController = require('./doctorSchedule.controller');

router.post('/doctors/:doctorId/schedule', doctorScheduleController.createSchedule);
router.get('/doctors/:doctorId/:day', doctorScheduleController.getSchedule);
router.put('/doctors/:doctorId/:day', doctorScheduleController.updateAvailability);

module.exports = router;