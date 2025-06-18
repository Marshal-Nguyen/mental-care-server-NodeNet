const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

class DoctorScheduleService {
    async createSchedule(doctorId, schedule) {
        const { daysOfWeek, slotsPerDay, slotDuration } = schedule;
        const validDays = [0, 1, 2, 3, 4, 5, 6]; // Sunday (0) to Saturday (6)

        if (!daysOfWeek.every(day => validDays.includes(day)) || slotsPerDay <= 0 || slotDuration <= 0) {
            throw new Error('Invalid schedule parameters');
        }

        // Xóa lịch cũ của bác sĩ
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

        // Tạo lịch cho cả tháng hiện tại (tháng 6/2025)
        const currentDate = new Date(2025, 5, 1); // Bắt đầu từ 1/6/2025
        const endDate = new Date(2025, 6, 0); // Kết thúc vào 30/6/2025

        while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay();
            if (daysOfWeek.includes(dayOfWeek)) {
                await this.updateAvailability(doctorId, currentDate.toISOString().split('T')[0], true);
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return { message: 'Schedule created successfully for the month' };
    }

    async getSchedule(doctorId, day) {
        const selectedDate = new Date(day).toISOString().split('T')[0];
        const dayOfWeek = new Date(day).getDay();

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
        startTime.setHours(8, 0, 0, 0);
        startTime.setFullYear(new Date(day).getFullYear());
        startTime.setMonth(new Date(day).getMonth());
        startTime.setDate(new Date(day).getDate());

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
            if (endTime.getHours() === 12 && endTime.getMinutes() === 0) {
                currentSlot = new Date(currentSlot.getTime() + 60 * 60 * 1000); // Skip lunch 12:00-13:00
                continue;
            }
            if (endTime.getHours() > 17) break;

            const startTimeStr = currentSlot.toTimeString().slice(0, 5);
            const endTimeStr = endTime.toTimeString().slice(0, 5);

            const isBooked = bookedSlots.some(booked => {
                const bookedEndTime = new Date(`1970-01-01 ${booked.StartTime} UTC`);
                bookedEndTime.setMinutes(bookedEndTime.getMinutes() + booked.Duration);
                const bookedEndTimeStr = bookedEndTime.toTimeString().slice(0, 5);
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