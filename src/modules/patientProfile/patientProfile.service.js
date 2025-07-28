const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.getAllPatientProfiles = async (pageIndex = 1, pageSize = 10, sortBy = 'FullName', sortOrder = 'asc') => {
    const start = (pageIndex - 1) * pageSize;
    const end = start + pageSize - 1;

    const validSortFields = ['FullName', 'Gender'];
    const validSortOrders = ['asc', 'desc'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'FullName';
    const order = validSortOrders.includes(sortOrder) ? sortOrder : 'asc';

    const { data, error: dataError, count } = await supabase
        .from('PatientProfiles')
        .select(`
            *,
            MedicalHistories (
                *,
                MedicalHistorySpecificMentalDisorder (
                    *,
                    MentalDisorders (*)
                ),
                MedicalHistoryPhysicalSymptom (
                    *,
                    PhysicalSymptoms (*)
                )
            )
        `, { count: 'exact' })
        .order(sortField, { ascending: order === 'asc' })
        .range(start, end);

    if (dataError) throw dataError;

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
        data,
        pageIndex,
        pageSize,
        totalCount,
        totalPages,
    };
};

exports.searchPatientProfilesByName = async (fullName = '', pageIndex = 1, pageSize = 10, sortBy = 'FullName', sortOrder = 'asc') => {
    const start = (pageIndex - 1) * pageSize;
    const end = start + pageSize - 1;

    const validSortFields = ['FullName', 'Gender'];
    const validSortOrders = ['asc', 'desc'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'FullName';
    const order = validSortOrders.includes(sortOrder) ? sortOrder : 'asc';
    const query = supabase
        .from('PatientProfiles')
        .select(`
            *,
            MedicalHistories (
                *,
                MedicalHistorySpecificMentalDisorder (
                    *,
                    MentalDisorders (*)
                ),
                MedicalHistoryPhysicalSymptom (
                    *,
                    PhysicalSymptoms (*)
                )
            )
        `, { count: 'exact' })
        .order(sortField, { ascending: order === 'asc' })
        .range(start, end);

    if (fullName.trim()) {
        query.ilike('FullName', `%${fullName}%`);
    }

    const { data, error: dataError, count } = await query;

    if (dataError) throw dataError;

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
        data,
        pageIndex,
        pageSize,
        totalCount,
        totalPages,
    };
};

exports.getPatientProfileById = async (id) => {
    const { data, error } = await supabase
        .from('PatientProfiles')
        .select(`
            *,
            MedicalHistories (
                *,
                MedicalHistorySpecificMentalDisorder (
                    *,
                    MentalDisorders (*)
                ),
                MedicalHistoryPhysicalSymptom (
                    *,
                    PhysicalSymptoms (*)
                )
            )
        `)
        .eq('Id', id)
        .single();
    if (error) throw error;
    if (!data) throw new Error('Bệnh nhân không tồn tại');
    return data;
};

exports.createPatientProfile = async (profileData) => {
    const { data, error } = await supabase.from('PatientProfiles').insert([profileData]).select();
    if (error) throw error;
    return data[0];
};

exports.updatePatientProfile = async (id, profileData) => {
    const { data, error } = await supabase
        .from('PatientProfiles')
        .update(profileData)
        .eq('Id', id)
        .select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Bệnh nhân không tồn tại');
    return data[0];
};

exports.deletePatientProfile = async (id) => {
    const { data, error } = await supabase
        .from('PatientProfiles')
        .update({
            FullName: null,
            Gender: null,
            Allergies: null,
            MedicalHistoryId: null,
            Email: null,
            PhoneNumber: null,
            CreatedAt: null,
            CreatedBy: null,
            BirthDate: null,
            LastModified: null,
            LastModifiedBy: null,
            PersonalityTraits: null,
            Address: null
        })
        .eq('Id', id)
        .select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Bệnh nhân không tồn tại');
    return data[0];
};

exports.getPatientStatistics = async (startDate, endDate) => {
    // Validate input dates
    if (!startDate || !endDate) {
        throw new Error('startDate and endDate are required');
    }

    // Parse and validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime())) {
        throw new Error('Invalid startDate format. Use YYYY-MM-DD');
    }
    if (isNaN(end.getTime())) {
        throw new Error('Invalid endDate format. Use YYYY-MM-DD');
    }

    // Set endDate to end of the day
    const endOfDay = new Date(end);
    endOfDay.setHours(23, 59, 59, 999);

    // Ensure endDate is after startDate
    if (endOfDay < start) {
        throw new Error('endDate must be after startDate');
    }

    // Số người dùng đăng ký trong khoảng thời gian
    const { count: registeredInPeriod, error: countError } = await supabase
        .from('PatientProfiles')
        .select('*', { count: 'exact' })
        .gte('CreatedAt', start.toISOString())
        .lte('CreatedAt', endOfDay.toISOString());

    if (countError) throw new Error(countError.message);

    // Số lượng giới tính
    const { data: genderData, error: genderError } = await supabase
        .from('PatientProfiles')
        .select('Gender')
        .gte('CreatedAt', start.toISOString())
        .lte('CreatedAt', endOfDay.toISOString());

    if (genderError) throw new Error(genderError.message);

    const genderStats = {
        male: genderData.filter(p => p.Gender === 'Male').length,
        female: genderData.filter(p => p.Gender === 'Female').length,
        other: genderData.filter(p => p.Gender !== 'Male' && p.Gender !== 'Female' || !p.Gender).length,
    };

    // Tổng số người
    const { count: totalCount, error: totalCountError } = await supabase
        .from('PatientProfiles')
        .select('*', { count: 'exact' });

    if (totalCountError) throw new Error(totalCountError.message);

    return {
        registeredInPeriod: registeredInPeriod || 0,
        genderStats,
        totalCount: totalCount || 0,
    };
};

exports.getMedicalHistoriesByPatientId = async (patientId) => {
    const { data, error } = await supabase
        .from('MedicalHistories')
        .select(`
            *,
            MedicalHistoryPhysicalSymptom (
                *,
                PhysicalSymptoms (*)
            ),
            MedicalHistorySpecificMentalDisorder (
                *,
                MentalDisorders (*)
            )
        `)
        .eq('PatientId', patientId);
    if (error) throw new Error(error.message);
    return data;
};