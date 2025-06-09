const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.getAllPatientProfiles = async (pageIndex = 1, pageSize = 10) => {
    const start = (pageIndex - 1) * pageSize;
    const end = start + pageSize - 1;

    // Lấy dữ liệu phân trang
    const { data, error: dataError, count } = await supabase
        .from('PatientProfiles')
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
    const { data, error } = await supabase.from('PatientProfiles').insert([profileData]);
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