const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Custom error class for better error handling
class ScheduleError extends Error {
    constructor(message, code = 'SCHEDULE_ERROR') {
        super(message);
        this.name = 'ScheduleError';
        this.code = code;
    }
}

// Utility functions for date operations
const DateUtils = {
    getMonthStart(year, month) {
        return new Date(Date.UTC(year, month - 1, 1));
    },
    getMonthEnd(year, month) {
        return new Date(Date.UTC(year, month, 0));
    },
    isPastMonth(year, month) {
        const current = new Date();
        current.setUTCHours(0, 0, 0, 0);
        const requestMonth = this.getMonthStart(year, month);
        const currentMonth = this.getMonthStart(current.getUTCFullYear(), current.getUTCMonth() + 1);
        return requestMonth < currentMonth;
    },
    isPastOrCurrentDate(date) {
        const current = new Date();
        current.setUTCHours(0, 0, 0, 0);
        const tomorrow = new Date(current);
        tomorrow.setUTCDate(current.getUTCDate() + 1);
        return new Date(date) < tomorrow;
    },
    formatTime(date) {
        return date.toISOString().slice(11, 16); // HH:mm
    },
    formatDate(date) {
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
    }
};

// Validation utility
const Validation = {
    validDays: [0, 1, 2, 3, 4, 5, 6],
    validateSchedule({ daysOfWeek, slotsPerDay, slotDuration, month, year }) {
        if (!Array.isArray(daysOfWeek) || !daysOfWeek.every(day => this.validDays.includes(day))) {
            throw new ScheduleError('Invalid days of week');
        }
        if (!Number.isInteger(slotsPerDay) || slotsPerDay <= 0) {
            throw new ScheduleError('Invalid slots per day');
        }
        if (!Number.isInteger(slotDuration) || slotDuration <= 0) {
            throw new ScheduleError('Invalid slot duration');
        }
        if (!Number.isInteger(month) || month < 1 || month > 12) {
            throw new ScheduleError('Invalid month');
        }
        if (!Number.isInteger(year) || year < 1900) {
            throw new ScheduleError('Invalid year');
        }
    },
    validateMaxSlots(slotsPerDay, slotDuration) {
        const workingHours = 8; // 8:00-12:00 + 13:00-17:00
        const maxSlots = Math.floor((workingHours * 60) / slotDuration);
        if (slotsPerDay > maxSlots) {
            throw new ScheduleError(`Slots per day (${slotsPerDay}) exceeds maximum (${maxSlots}) due to lunch break`);
        }
    }
};

class DoctorScheduleService {
    async createSchedule(doctorId, schedule) {
        const { daysOfWeek, slotsPerDay, slotDuration, month, year } = schedule;

        // Validate inputs
        Validation.validateSchedule(schedule);
        Validation.validateMaxSlots(slotsPerDay, slotDuration);
        if (DateUtils.isPastMonth(year, month)) {
            throw new ScheduleError('Cannot create schedule for past month');
        }

        // Determine date range
        let startDate = DateUtils.getMonthStart(year, month);
        const currentDate = new Date();
        currentDate.setUTCHours(0, 0, 0, 0);
        const isCurrentMonth = year === currentDate.getUTCFullYear() && month === currentDate.getUTCMonth() + 1;

        // If it's the current month, start from tomorrow
        if (isCurrentMonth && startDate <= currentDate) {
            startDate.setUTCDate(currentDate.getUTCDate() + 1);
        }
        const endDate = DateUtils.getMonthEnd(year, month);

        try {
            // Step 1: Delete existing availability records for the allowed date range
            const deleteQuery = supabase
                .from('DoctorAvailabilities')
                .delete()
                .eq('DoctorId', doctorId)
                .gte('Date', DateUtils.formatDate(startDate))
                .lte('Date', DateUtils.formatDate(endDate));

            const { error: deleteError } = await deleteQuery;
            if (deleteError) {
                throw new ScheduleError(`Failed to delete existing schedule: ${deleteError.message}`);
            }

            // Step 2: Prepare data for batch insert
            const availabilityRecords = [];
            let currentDateIter = new Date(startDate);

            // Loop through each day in the allowed date range
            while (currentDateIter <= endDate) {
                const dayOfWeek = currentDateIter.getUTCDay();
                if (daysOfWeek.includes(dayOfWeek)) {
                    // Generate time slots for the day
                    let currentSlot = new Date(currentDateIter);
                    currentSlot.setUTCHours(8, 0, 0, 0); // Start at 8:00 AM UTC
                    let slotsGenerated = 0;

                    while (slotsGenerated < slotsPerDay) {
                        const endTime = new Date(currentSlot.getTime() + slotDuration * 60 * 1000);

                        // Skip lunch break (12:00-13:00)
                        if (currentSlot.getUTCHours() === 12 && currentSlot.getUTCMinutes() === 0) {
                            currentSlot.setUTCHours(13, 0, 0, 0);
                            continue;
                        }

                        // Stop if beyond working hours (17:00)
                        if (endTime.getUTCHours() > 17 || (endTime.getUTCHours() === 17 && endTime.getUTCMinutes() > 0)) {
                            break;
                        }

                        // Add availability record
                        availabilityRecords.push({
                            DoctorId: doctorId,
                            Date: DateUtils.formatDate(currentSlot),
                            StartTime: DateUtils.formatTime(currentSlot),
                            IsAvailable: true
                        });

                        slotsGenerated++;
                        currentSlot = endTime;
                    }
                }
                currentDateIter.setUTCDate(currentDateIter.getUTCDate() + 1);
            }

            // Step 3: Insert new records into DoctorAvailabilities
            if (availabilityRecords.length > 0) {
                const { error: insertError } = await supabase
                    .from('DoctorAvailabilities')
                    .insert(availabilityRecords);

                if (insertError) {
                    throw new ScheduleError(`Failed to create schedule: ${insertError.message}`);
                }
            }

            // Step 4: Save or update schedule configuration to DoctorSlotDurations
            await supabase
                .from('DoctorSlotDurations')
                .upsert({
                    DoctorId: doctorId,
                    SlotDuration: slotDuration,
                    SlotsPerDay: slotsPerDay
                });

            return { message: `Schedule created successfully for ${month}/${year}` };
        } catch (error) {
            throw new ScheduleError(`Failed to create schedule: ${error.message}`, 'CREATE_SCHEDULE_FAILED');
        }
    }

    async getSchedule(doctorId, day) {
        try {
            // Validate inputs
            if (!doctorId || !day) {
                throw new ScheduleError('Missing doctorId or day');
            }
            const selectedDate = new Date(day);
            if (isNaN(selectedDate.getTime())) {
                throw new ScheduleError('Invalid date');
            }
            selectedDate.setUTCHours(0, 0, 0, 0);
            const selectedDateStr = DateUtils.formatDate(selectedDate);

            // Fetch schedule configuration, availability, and bookings in parallel
            const [scheduleRes, availabilityRes, bookingsRes] = await Promise.all([
                supabase
                    .from('DoctorSlotDurations')
                    .select('SlotDuration, SlotsPerDay')
                    .eq('DoctorId', doctorId)
                    .limit(1)
                    .single(),
                supabase
                    .from('DoctorAvailabilities')
                    .select('StartTime, IsAvailable')
                    .eq('DoctorId', doctorId)
                    .eq('Date', selectedDateStr),
                supabase
                    .from('Bookings')
                    .select('StartTime, Duration')
                    .eq('DoctorId', doctorId)
                    .eq('Date', selectedDateStr)
            ]);

            const { data: schedule, error: scheduleError } = scheduleRes;
            const { data: availabilities, error: availError } = availabilityRes;
            const { data: bookings, error: bookedError } = bookingsRes;

            // Check for schedule configuration errors
            if (scheduleError || !schedule) {
                throw new ScheduleError(scheduleError?.message || 'Schedule configuration not found');
            }

            // Check for availability errors or no available slots
            if (availError) {
                console.error(`Error fetching availability: ${availError.message}`);
                return { timeSlots: [], message: 'Error fetching availability' };
            }
            if (!availabilities || availabilities.length === 0 || availabilities.every(slot => !slot.IsAvailable)) {
                return { timeSlots: [], message: 'Doctor not available on this date' };
            }

            // Log warning if bookings fetch fails
            if (bookedError) {
                console.warn(`Warning: Failed to fetch bookings: ${bookedError.message}`);
            }

            // Generate time slots
            const { SlotDuration: slotDuration, SlotsPerDay: slotsPerDay } = schedule;
            const timeSlots = this.generateTimeSlots(selectedDate, slotDuration, slotsPerDay, bookings || [], availabilities);

            return {
                timeSlots,
                message: timeSlots.length > 0 ? 'Schedule retrieved successfully' : 'No available slots'
            };
        } catch (error) {
            throw new ScheduleError(`Failed to get schedule: ${error.message}`, 'GET_SCHEDULE_FAILED');
        }
    }

    async updateAvailability(doctorId, day, isAvailable) {
        try {
            if (DateUtils.isPastOrCurrentDate(day)) {
                throw new ScheduleError('Cannot update availability for past or current date');
            }
            const selectedDateStr = DateUtils.formatDate(new Date(day));

            const { data: existing, error: fetchError } = await supabase
                .from('DoctorAvailabilities')
                .select('Id, IsAvailable')
                .eq('DoctorId', doctorId)
                .eq('Date', selectedDateStr)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                throw new ScheduleError(`Failed to fetch availability: ${fetchError.message}`);
            }

            const operation = existing
                ? supabase
                    .from('DoctorAvailabilities')
                    .update({ IsAvailable: isAvailable })
                    .eq('Id', existing.Id)
                : supabase
                    .from('DoctorAvailabilities')
                    .insert({
                        DoctorId: doctorId,
                        Date: selectedDateStr,
                        StartTime: '08:00',
                        IsAvailable: isAvailable
                    });

            const { error } = await operation;
            if (error) {
                throw new ScheduleError(`Failed to update availability: ${error.message}`);
            }

            return { message: 'Availability updated successfully', isAvailable };
        } catch (error) {
            throw new ScheduleError(`Failed to update availability: ${error.message}`, 'UPDATE_AVAILABILITY_FAILED');
        }
    }

    generateTimeSlots(selectedDate, slotDuration, slotsPerDay, bookings) {
        const timeSlots = [];
        let currentSlot = new Date(selectedDate);
        currentSlot.setUTCHours(8, 0, 0, 0); // Start at 8:00 AM UTC
        let slotsGenerated = 0;

        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = daysOfWeek[selectedDate.getUTCDay()];

        while (slotsGenerated < slotsPerDay) {
            const endTime = new Date(currentSlot.getTime() + slotDuration * 60 * 1000);

            // Skip lunch break (12:00-13:00)
            if (currentSlot.getUTCHours() === 12 && currentSlot.getUTCMinutes() === 0) {
                currentSlot.setUTCHours(13, 0, 0, 0);
                continue;
            }

            // Stop if beyond working hours (17:00)
            if (endTime.getUTCHours() > 17 || (endTime.getUTCHours() === 17 && endTime.getUTCMinutes() > 0)) {
                break;
            }

            const startTimeStr = DateUtils.formatTime(currentSlot);
            const endTimeStr = DateUtils.formatTime(endTime);

            // Check if slot is booked
            const isBooked = bookings.some(booked => {
                const bookedStart = new Date(`1970-01-01T${booked.StartTime}Z`);
                const bookedEnd = new Date(bookedStart.getTime() + booked.Duration * 60 * 1000);
                const slotStart = new Date(`1970-01-01T${startTimeStr}:00Z`);
                const slotEnd = new Date(`1970-01-01T${endTimeStr}:00Z`);
                return slotStart < bookedEnd && slotEnd > bookedStart;
            });

            if (!isBooked) {
                timeSlots.push({
                    status: 'Available',
                    dayOfWeek,
                    startTime: startTimeStr,
                    endTime: endTimeStr,
                    occupiedInfo: ''
                });
                slotsGenerated++;
            }

            currentSlot = endTime;
        }

        return timeSlots;
    }
}

module.exports = new DoctorScheduleService();