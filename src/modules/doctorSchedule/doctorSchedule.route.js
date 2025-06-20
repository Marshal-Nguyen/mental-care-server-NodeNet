// const express = require('express');
// const router = express.Router();
// const doctorScheduleController = require('./doctorSchedule.controller');

// router.post('/doctors/:doctorId/schedule', doctorScheduleController.createSchedule);
// router.get('/doctors/:doctorId/:day', doctorScheduleController.getSchedule);
// router.put('/doctors/:doctorId/:day', doctorScheduleController.updateAvailability);

// module.exports = router;
const express = require('express');
const router = express.Router();
const doctorScheduleController = require('./doctorSchedule.controller');

// Middleware kiểm tra dữ liệu đầu vào
const validateCreateSchedule = (req, res, next) => {
    const { daysOfWeek, slotsPerDay, slotDuration, month, year } = req.body;
    if (!daysOfWeek || !slotsPerDay || !slotDuration || !month || !year) {
        return res.status(400).json({ message: 'Thiếu thông tin bắt buộc: daysOfWeek, slotsPerDay, slotDuration, month, year' });
    }
    next();
};

// Định nghĩa các endpoint
router.post('/doctors/:doctorId/schedule', validateCreateSchedule, doctorScheduleController.createSchedule);
router.get('/doctors/:doctorId/:day', doctorScheduleController.getSchedule);
router.put('/doctors/:doctorId/:day', doctorScheduleController.updateAvailability);

module.exports = router;