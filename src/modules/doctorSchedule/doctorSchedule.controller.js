const doctorScheduleService = require('./doctorSchedule.service');

class DoctorScheduleController {
    async createSchedule(req, res) {
        const { doctorId } = req.params;
        const { daysOfWeek, slotsPerDay, slotDuration } = req.body;
        try {
            console.log('Creating schedule for doctor:', doctorId, 'with data:', { daysOfWeek, slotsPerDay, slotDuration });
            const result = await doctorScheduleService.createSchedule(doctorId, { daysOfWeek, slotsPerDay, slotDuration });
            return res.status(200).json(result);
        } catch (error) {
            console.error('Error in createSchedule:', error);
            return res.status(400).json({ message: error.message || 'Error creating schedule', error });
        }
    }

    async getSchedule(req, res) {
        const { doctorId, day } = req.params;
        try {
            console.log('Fetching schedule for doctor:', doctorId, 'on day:', day);
            const result = await doctorScheduleService.getSchedule(doctorId, day);
            return res.status(200).json(result);
        } catch (error) {
            console.error('Error in getSchedule:', error);
            return res.status(500).json({ message: 'Error fetching schedule', error });
        }
    }

    async updateAvailability(req, res) {
        const { doctorId, day } = req.params;
        const { isAvailable } = req.body;
        try {
            const currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0); // Đặt giờ về 00:00:00 để so sánh ngày
            const requestDate = new Date(day);
            requestDate.setHours(0, 0, 0, 0);

            console.log('Updating availability for doctor:', doctorId, 'on day:', day, 'to:', isAvailable);
            if (requestDate <= currentDate) {
                return res.status(400).json({ message: 'Cannot update availability for past or current date. Only future dates are allowed.' });
            }

            const result = await doctorScheduleService.updateAvailability(doctorId, day, isAvailable);
            return res.status(200).json(result);
        } catch (error) {
            console.error('Error in updateAvailability:', error);
            return res.status(400).json({ message: error.message || 'Error updating availability', error });
        }
    }
}

module.exports = new DoctorScheduleController();