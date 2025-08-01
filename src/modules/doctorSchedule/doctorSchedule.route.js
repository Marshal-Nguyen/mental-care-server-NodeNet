
const express = require('express');
const router = express.Router();
const doctorScheduleController = require('./doctorSchedule.controller');
const { authMiddleware, restrictTo } = require('../../middlewares/auth.middleware');

// Middleware kiểm tra dữ liệu đầu vào
const validateCreateSchedule = (req, res, next) => {
    const { daysOfWeek, slotsPerDay, slotDuration, month, year } = req.body;
    if (!daysOfWeek || !slotsPerDay || !slotDuration || !month || !year) {
        return res.status(400).json({ message: 'Thiếu thông tin bắt buộc: daysOfWeek, slotsPerDay, slotDuration, month, year' });
    }
    next();
};

// Định nghĩa các endpoint
router.post('/doctors/:doctorId/schedule', authMiddleware, restrictTo('Doctor'), validateCreateSchedule, doctorScheduleController.createSchedule);
router.get('/doctors/:doctorId/:day', doctorScheduleController.getSchedule);
router.put('/doctors/:doctorId/:day', doctorScheduleController.updateAvailability);
// router.post('/doctors/:doctorId/schedule', authMiddleware, restrictTo('Doctor'), validateCreateSchedule, doctorScheduleController.createSchedule);
// router.get('/doctors/:doctorId/:day', doctorScheduleController.getSchedule);
// router.put('/doctors/:doctorId/:day', authMiddleware, restrictTo('Doctor'), doctorScheduleController.updateAvailability);

module.exports = router;