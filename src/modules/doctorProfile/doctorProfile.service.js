const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.getAllDoctorProfiles = async () => {
    const { data, error } = await supabase.from('DoctorProfiles').select('*');
    if (error) throw error;
    return data;
};

exports.getDoctorProfileById = async (id) => {
    const { data, error } = await supabase
        .from('DoctorProfiles')
        .select('*')
        .eq('id', id)
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
        .eq('id', id);
    if (error) throw error;
    if (!data.length) throw new Error('Bác sĩ không tồn tại');
    return data[0];
};

exports.deleteDoctorProfile = async (id) => {
    const { data, error } = await supabase
        .from('DoctorProfiles')
        .delete()
        .eq('id', id);
    if (error) throw error;
    if (!data.length) throw new Error('Bác sĩ không tồn tại');
    return data[0];
};