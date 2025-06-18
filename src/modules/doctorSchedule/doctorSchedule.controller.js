const doctorScheduleService = require('./doctorSchedule.service');

class DoctorScheduleController {
    async createSchedule(req, res) {
        const { doctorId } = req.params;
        const { daysOfWeek, slotsPerDay, slotDuration } = req.body;
        try {
            const result = await doctorScheduleService.createSchedule(doctorId, { daysOfWeek, slotsPerDay, slotDuration });
            return res.status(200).json(result);
        } catch (error) {
            return res.status(500).json({ message: 'Error creating schedule', error });
        }
    }

    async getSchedule(req, res) {
        const { doctorId, day } = req.params;
        try {
            const result = await doctorScheduleService.getSchedule(doctorId, day);
            return res.status(200).json(result);
        } catch (error) {
            return res.status(500).json({ message: 'Error fetching schedule', error });
        }
    }

    async updateAvailability(req, res) {
        const { doctorId, day } = req.params;
        const { isAvailable } = req.body;
        try {
            const result = await doctorScheduleService.updateAvailability(doctorId, day, isAvailable);
            return res.status(200).json(result);
        } catch (error) {
            return res.status(500).json({ message: 'Error updating availability', error });
        }
    }
}

module.exports = new DoctorScheduleController();