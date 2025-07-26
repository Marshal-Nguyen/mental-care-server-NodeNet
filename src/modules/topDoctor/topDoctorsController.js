const topDoctorsService = require('./topDoctorsService');

const getTopDoctors = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate và endDate là bắt buộc' });
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
            return res.status(400).json({ error: 'Định dạng ngày không hợp lệ. Sử dụng YYYY-MM-DD' });
        }

        const result = await topDoctorsService.getTopDoctors(startDate, endDate);
        res.status(200).json(result);
    } catch (error) {
        console.error('Lỗi trong getTopDoctors controller:', error.message, error.stack);
        res.status(500).json({ error: 'Lỗi server nội bộ', details: error.message });
    }
};

module.exports = { getTopDoctors };