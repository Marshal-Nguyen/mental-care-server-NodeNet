const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const getTopDoctors = async (startDate, endDate) => {
    try {
        const { data, error } = await supabase
            .from('Bookings')
            .select(`
                DoctorId,
                DoctorProfiles!inner (
                    FullName
                ),
                Status,
                Date
            `)
            .gte('Date', startDate)
            .lte('Date', endDate)

        if (error) {
            throw new Error(`Lỗi truy vấn Supabase: ${error.message}`);
        }

        // Nhóm và đếm trong Node.js
        const doctorMap = data.reduce((acc, item) => {
            const key = `${item.DoctorId}_${item.DoctorProfiles.FullName}`;
            if (!acc[key]) {
                acc[key] = {
                    doctorId: item.DoctorId,
                    doctorName: item.DoctorProfiles.FullName,
                    bookingCount: 0
                };
            }
            acc[key].bookingCount += 1;
            return acc;
        }, {});

        // Chuyển object thành mảng, sắp xếp và giới hạn 5
        const result = Object.values(doctorMap)
            .sort((a, b) => b.bookingCount - a.bookingCount)
            .slice(0, 5);

        return result;
    } catch (error) {
        console.error('Lỗi trong getTopDoctors service:', error.message, error.stack);
        throw error;
    }
};
const getBookingStats = async (doctorId, month, year) => {
    const startDate = `${year}-${month.padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0]; // Ngày cuối tháng

    try {
        const { data: bookings, error } = await supabase
            .from("Bookings")
            .select("Price")
            .eq("DoctorId", doctorId)
            .gte("Date", startDate)
            .lte("Date", endDate)

        if (error) throw error;

        const totalBookings = bookings.length;
        const totalAmount = bookings.reduce((sum, booking) => sum + booking.Price, 0);

        return {
            doctorId,
            month,
            year,
            totalBookings,
            totalAmount,
        };
    } catch (err) {
        throw new Error(`Lỗi khi lấy thống kê: ${err.message}`);
    }
};
module.exports = { getTopDoctors, getBookingStats };