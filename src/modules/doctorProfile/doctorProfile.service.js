const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.getAllDoctorProfiles = async (pageIndex = 1, pageSize = 10) => {
    const start = (pageIndex - 1) * pageSize;
    const end = start + pageSize - 1;

    // Lấy dữ liệu phân trang
    const { data, error: dataError, count } = await supabase
        .from('DoctorProfiles')
        .select('*', { count: 'exact' })
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

exports.getDoctorProfileById = async (id) => {
    const { data, error } = await supabase
        .from('DoctorProfiles')
        .select('*')
        .eq('Id', id)
        .single();
    if (error) throw error;
    if (!data) throw new Error('Bác sĩ không tồn tại');
    return data;
};

exports.createDoctorProfile = async (profileData) => {
    const { data, error } = await supabase.from('DoctorProfiles').insert([profileData]);
    if (error) throw error;
    return data[0];
};

exports.updateDoctorProfile = async (id, profileData) => {
    const { data, error } = await supabase
        .from('DoctorProfiles')
        .update(profileData)
        .eq('Id', id)
        .select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Bác sĩ không tồn tại');
    return data[0];
};

exports.deleteDoctorProfile = async (id) => {
    const { data, error } = await supabase
        .from('DoctorProfiles')
        .update({
            PhoneNumber: null,
            FullName: null,
            Gender: null,
            YearsOfExperience: null,
            Rating: null,
            TotalReviews: null,
            Address: null,
            Email: null,
            Qualifications: null,
            Bio: null

        })
        .eq('Id', id)
        .select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Bác sĩ không tồn tại');
    return data[0];
};