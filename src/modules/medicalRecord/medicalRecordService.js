const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
exports.createMedicalRecord = async ({ patientProfileId, doctorProfileId, medicalHistoryId, status, createdBy, lastModifiedBy }) => {
    const { data, error } = await supabase
        .from('MedicalRecords')
        .insert({ patientProfileId, doctorProfileId, medicalHistoryId, status, createdBy, lastModifiedBy, createdAt: new Date(), lastModified: new Date() })
        .select();
    if (error) throw new Error(error.message);
    return data[0];
};

exports.getMedicalRecord = async (id) => {
    const { data, error } = await supabase
        .from('MedicalRecords')
        .select('*')
        .eq('id', id)
        .single();
    if (error) throw new Error(error.message);
    return data;
};

exports.updateMedicalRecord = async (id, { patientProfileId, doctorProfileId, medicalHistoryId, status, lastModifiedBy }) => {
    const { data, error } = await supabase
        .from('MedicalRecords')
        .update({ patientProfileId, doctorProfileId, medicalHistoryId, status, lastModifiedBy, lastModified: new Date() })
        .eq('id', id)
        .select();
    if (error) throw new Error(error.message);
    return data[0];
};

exports.deleteMedicalRecord = async (id) => {
    const { error } = await supabase
        .from('MedicalRecords')
        .delete()
        .eq('id', id);
    if (error) throw new Error(error.message);
};