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
        .select('*', { count: 'exact' })
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
        .select('*', { count: 'exact' })
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
        .select('*')
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

exports.getPatientStatistics = async () => {
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

    // Số người dùng đăng ký tháng này
    const { count: registeredThisMonth } = await supabase
        .from('PatientProfiles')
        .select('*', { count: 'exact' })
        .gte('CreatedAt', startOfMonth.toISOString())
        .lte('CreatedAt', endOfMonth.toISOString());

    // Số lượng giới tính
    const { data: genderData } = await supabase
        .from('PatientProfiles')
        .select('Gender')
        .gte('CreatedAt', startOfMonth.toISOString())
        .lte('CreatedAt', endOfMonth.toISOString());
    const genderStats = {
        male: genderData.filter(p => p.Gender === 'Male').length,
        female: genderData.filter(p => p.Gender === 'Female').length,
        other: genderData.filter(p => p.Gender !== 'Male' && p.Gender !== 'Female' || !p.Gender).length,
    };

    // Tổng số người
    const { count: totalCount } = await supabase
        .from('PatientProfiles')
        .select('*', { count: 'exact' });

    return {
        registeredThisMonth: registeredThisMonth || 0,
        genderStats,
        totalCount: totalCount || 0,
    };
};