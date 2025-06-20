const doctorScheduleService = require('./doctorSchedule.service');

class DoctorScheduleController {
    async createSchedule(req, res) {
        const { doctorId } = req.params;
        const { daysOfWeek, slotsPerDay, slotDuration, month, year } = req.body;

        // Kiểm tra month và year hợp lệ
        if (!month || !year || month < 1 || month > 12 || year < new Date().getUTCFullYear()) {
            return res.status(400).json({ message: 'Tháng hoặc năm không hợp lệ. Chỉ cho phép tháng hiện tại hoặc tương lai.' });
        }

        const currentDate = new Date();
        currentDate.setUTCHours(0, 0, 0, 0);
        const requestMonth = new Date(Date.UTC(year, month - 1, 1));
        const currentMonth = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), 1));

        if (requestMonth < currentMonth) {
            return res.status(400).json({ message: 'Không thể tạo lịch cho tháng trong quá khứ.' });
        }

        try {
            console.log('Tạo lịch cho bác sĩ:', doctorId, 'với dữ liệu:', { daysOfWeek, slotsPerDay, slotDuration, month, year });
            const result = await doctorScheduleService.createSchedule(doctorId, { daysOfWeek, slotsPerDay, slotDuration, month, year });
            return res.status(200).json(result);
        } catch (error) {
            console.error('Lỗi khi tạo lịch:', error);
            return res.status(400).json({ message: error.message || 'Lỗi tạo lịch', error });
        }
    }

    async getSchedule(req, res) {
        const { doctorId, day } = req.params;
        try {
            console.log('Lấy lịch cho bác sĩ:', doctorId, 'ngày:', day);
            const result = await doctorScheduleService.getSchedule(doctorId, day);
            return res.status(200).json(result);
        } catch (error) {
            console.error('Lỗi khi lấy lịch:', error);
            return res.status(500).json({ message: 'Lỗi khi lấy lịch', error });
        }
    }

    async updateAvailability(req, res) {
        const { doctorId, day } = req.params;
        const { isAvailable } = req.body; // Sửa lỗi từ res.body thành req.body
        try {
            const currentDate = new Date();
            currentDate.setUTCHours(0, 0, 0, 0);
            const requestDate = new Date(day);
            requestDate.setUTCHours(0, 0, 0, 0);

            console.log('Cập nhật trạng thái khả dụng cho bác sĩ:', doctorId, 'ngày:', day, 'thành:', isAvailable);
            if (requestDate <= currentDate) {
                return res.status(400).json({ message: 'Không thể cập nhật trạng thái cho ngày hiện tại hoặc quá khứ. Chỉ cho phép ngày tương lai.' });
            }

            const result = await doctorScheduleService.updateAvailability(doctorId, day, isAvailable);
            return res.status(200).json(result);
        } catch (error) {
            console.error('Lỗi khi cập nhật trạng thái:', error);
            return res.status(400).json({ message: error.message || 'Lỗi cập nhật trạng thái khả dụng', error });
        }
    }
}

module.exports = new DoctorScheduleController();