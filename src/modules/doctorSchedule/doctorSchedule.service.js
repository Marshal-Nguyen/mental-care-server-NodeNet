const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

class DoctorScheduleService {
    async createSchedule(doctorId, schedule) {
        const { daysOfWeek, slotsPerDay, slotDuration } = schedule;
        const validDays = [0, 1, 2, 3, 4, 5, 6];

        if (!daysOfWeek.every(day => validDays.includes(day)) || slotsPerDay <= 0 || slotDuration <= 0) {
            throw new Error('Invalid schedule parameters');
        }

        console.log('Input data:', { daysOfWeek, slotsPerDay, slotDuration });

        // Khởi tạo ngày với UTC để tránh vấn đề múi giờ
        const currentDate = new Date();
        currentDate.setUTCHours(0, 0, 0, 0);
        console.log(`Current date (raw): ${currentDate}`);
        console.log(`Current date (normalized): ${currentDate.toISOString()}`);
        const startDate = new Date(currentDate);
        startDate.setUTCDate(currentDate.getUTCDate() + 1);
        console.log(`Start date: ${startDate.toISOString().split('T')[0]}`);

        // Tính endDate là ngày cuối của tháng hiện tại
        const endDate = new Date(currentDate.getUTCFullYear(), currentDate.getUTCMonth() + 1, 1);
        endDate.setUTCHours(0, 0, 0, 0);
        console.log(`End date: ${endDate.toISOString().split('T')[0]}`);

        // Xóa dữ liệu từ startDate trở đi trong DoctorAvailabilities
        const { error: deleteAvailError } = await supabase
            .from('DoctorAvailabilities')
            .delete()
            .eq('DoctorId', doctorId)
            .gte('Date', startDate.toISOString().split('T')[0]); // Chỉ xóa từ startDate trở đi
        if (deleteAvailError) throw deleteAvailError;

        // Tạo lịch từ startDate đến endDate
        const currentMonthDate = new Date(startDate);
        while (currentMonthDate <= endDate) {
            const dayOfWeek = currentMonthDate.getUTCDay();
            console.log(`Processing date: ${currentMonthDate.toISOString().split('T')[0]}`);
            if (daysOfWeek.includes(dayOfWeek)) {
                await this.updateAvailability(doctorId, currentMonthDate.toISOString().split('T')[0], true);
            }
            currentMonthDate.setUTCDate(currentMonthDate.getUTCDate() + 1);
        }

        // Xóa lịch cũ trong DoctorSlotDurations
        const { error: deleteError } = await supabase
            .from('DoctorSlotDurations')
            .delete()
            .eq('DoctorId', doctorId);
        if (deleteError) throw deleteError;

        // Thêm lịch mới
        const { error: insertError } = await supabase
            .from('DoctorSlotDurations')
            .insert({
                DoctorId: doctorId,
                SlotDuration: slotDuration,
                SlotsPerDay: slotsPerDay
            });
        if (insertError) throw insertError;

        return { message: 'Schedule created successfully for future dates' };
    }

    async getSchedule(doctorId, day) {
        const selectedDate = new Date(day).toISOString().split('T')[0];
        const dayOfWeek = new Date(day).getUTCDay();

        const { data: schedule, error: scheduleError } = await supabase
            .from('DoctorSlotDurations')
            .select('SlotDuration, SlotsPerDay')
            .eq('DoctorId', doctorId)
            .limit(1);

        if (scheduleError || !schedule || schedule.length === 0) {
            return { slots: [], message: 'No schedule found' };
        }

        const { SlotDuration: scheduleSlotDuration, SlotsPerDay } = schedule[0];
        const startTime = new Date();
        startTime.setUTCHours(8, 0, 0, 0);
        startTime.setUTCFullYear(new Date(day).getUTCFullYear());
        startTime.setUTCMonth(new Date(day).getUTCMonth());
        startTime.setUTCDate(new Date(day).getUTCDate());

        const { data: availability, error: availError } = await supabase
            .from('DoctorAvailabilities')
            .select('IsAvailable')
            .eq('DoctorId', doctorId)
            .eq('Date', selectedDate)
            .single();

        if (availError || !availability || !availability.IsAvailable) {
            return { slots: [], message: 'No available slots for this day' };
        }

        let bookedSlots = [];
        const { data, error: bookedError } = await supabase
            .from('Bookings')
            .select('StartTime, Duration')
            .eq('DoctorId', doctorId)
            .eq('Date', selectedDate);

        if (!bookedError && data) {
            bookedSlots = data;
        } else {
            console.warn('Warning: Could not fetch booked slots, proceeding with empty list:', bookedError?.message);
        }

        const slots = [];
        let currentSlot = new Date(startTime);
        for (let i = 0; i < SlotsPerDay; i++) {
            const endTime = new Date(currentSlot.getTime() + scheduleSlotDuration * 60 * 1000);
            if (endTime.getUTCHours() === 12 && endTime.getUTCMinutes() === 0) {
                currentSlot = new Date(currentSlot.getTime() + 60 * 60 * 1000); // Skip lunch 12:00-13:00
                continue;
            }
            if (endTime.getUTCHours() > 17) break;

            const startTimeStr = currentSlot.toISOString().slice(11, 16);
            const endTimeStr = endTime.toISOString().slice(11, 16);

            const isBooked = bookedSlots.some(booked => {
                const bookedEndTime = new Date(`1970-01-01T${booked.StartTime}Z`);
                bookedEndTime.setUTCMinutes(bookedEndTime.getUTCMinutes() + booked.Duration);
                const bookedEndTimeStr = bookedEndTime.toISOString().slice(11, 16);
                return startTimeStr === booked.StartTime || (startTimeStr < bookedEndTimeStr && endTimeStr > booked.StartTime);
            }) || false;

            if (!isBooked) {
                slots.push({
                    date: selectedDate,
                    startTime: startTimeStr,
                    endTime: endTimeStr,
                    isAvailable: true,
                    isBooked: false
                });
            }
            currentSlot = endTime;
        }

        return { slots, message: 'Schedule retrieved successfully' };
    }

    async updateAvailability(doctorId, day, isAvailable) {
        const selectedDate = new Date(day).toISOString().split('T')[0];
        console.log(`Updating availability for date: ${selectedDate}, isAvailable: ${isAvailable}`);

        const currentDate = new Date();
        currentDate.setUTCHours(0, 0, 0, 0);
        const startDate = new Date(currentDate);
        startDate.setUTCDate(currentDate.getUTCDate() + 1);
        const requestDate = new Date(day);
        requestDate.setUTCHours(0, 0, 0, 0);

        console.log(`Checking date: ${selectedDate}, startDate: ${startDate.toISOString().split('T')[0]}`);
        if (requestDate < startDate) { // Chỉ chặn các ngày trước startDate
            console.error(`Invalid date: ${selectedDate} is before ${startDate.toISOString().split('T')[0]}`);
            throw new Error('Cannot update availability for past or current date. Only future dates are allowed.');
        }

        const { data: existingAvailability, error: fetchError } = await supabase
            .from('DoctorAvailabilities')
            .select('Id, IsAvailable')
            .eq('DoctorId', doctorId)
            .eq('Date', selectedDate)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }

        if (existingAvailability) {
            const { error: updateError } = await supabase
                .from('DoctorAvailabilities')
                .update({ IsAvailable: isAvailable })
                .eq('Id', existingAvailability.Id);
            if (updateError) throw updateError;
            console.log(`Updated availability for ${selectedDate} to ${isAvailable}`);
        } else {
            const { error: insertError } = await supabase
                .from('DoctorAvailabilities')
                .insert({
                    DoctorId: doctorId,
                    Date: selectedDate,
                    StartTime: '08:00',
                    IsAvailable: isAvailable
                });
            if (insertError) throw insertError;
            console.log(`Inserted availability for ${selectedDate} with ${isAvailable}`);
        }

        return { message: 'Availability updated', isAvailable };
    }
}

module.exports = new DoctorScheduleService();