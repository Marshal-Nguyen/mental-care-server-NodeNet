const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Hàm kiểm tra định dạng ngày
const validateDateFormat = (dateStr) => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        throw new Error("diagnosedAt phải có định dạng yyyy-mm-dd");
    }
    const [year, month, day] = dateStr.split('-');
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) {
        throw new Error("Ngày diagnosedAt không hợp lệ");
    }
    return date;
};

// Hàm kiểm tra đầu vào
const validateInput = ({ patientId, createdBy, lastModifiedBy, physicalSymptoms = [], mentalDisorders = [] }) => {
    if (!patientId || typeof patientId !== 'string') throw new Error("patientId là bắt buộc và phải là chuỗi");
    if (!createdBy || typeof createdBy !== 'string') throw new Error("createdBy là bắt buộc và phải là chuỗi");
    if (!lastModifiedBy || typeof lastModifiedBy !== 'string') throw new Error("lastModifiedBy là bắt buộc và phải là chuỗi");
    if (!Array.isArray(physicalSymptoms) || !Array.isArray(mentalDisorders)) {
        throw new Error("physicalSymptoms và mentalDisorders phải là mảng");
    }
    physicalSymptoms.forEach((symptom, idx) => {
        if (!symptom.name || typeof symptom.name !== 'string') {
            throw new Error(`physicalSymptoms[${idx}].name là bắt buộc và phải là chuỗi`);
        }
    });
    mentalDisorders.forEach((disorder, idx) => {
        if (!disorder.name || typeof disorder.name !== 'string') {
            throw new Error(`mentalDisorders[${idx}].name là bắt buộc và phải là chuỗi`);
        }
    });
};

exports.createMedicalHistory = async ({ patientId, description, diagnosedAt, createdBy, lastModifiedBy, physicalSymptoms = [], mentalDisorders = [] }) => {
    // Kiểm tra đầu vào
    validateInput({ patientId, createdBy, lastModifiedBy, physicalSymptoms, mentalDisorders });
    const diagnosedAtDate = validateDateFormat(diagnosedAt);

    // Thêm MedicalHistory
    const { data: historyData, error: historyError } = await supabase
        .from('MedicalHistories')
        .insert({
            PatientId: patientId,
            Description: description || '',
            DiagnosedAt: diagnosedAtDate.toISOString(),
            CreatedBy: createdBy,
            LastModifiedBy: lastModifiedBy,
            CreatedAt: new Date().toISOString(),
            LastModified: new Date().toISOString()
        })
        .select('Id')
        .single();
    if (historyError) throw new Error(`Lỗi khi thêm MedicalHistory: ${historyError.message}`);
    const historyId = historyData.Id;

    // Cập nhật MedicalHistoryId trong PatientProfiles
    const { error: profileError } = await supabase
        .from('PatientProfiles')
        .update({ MedicalHistoryId: historyId })
        .eq('Id', patientId);
    if (profileError) throw new Error(`Lỗi khi cập nhật PatientProfiles: ${profileError.message}`);

    // Thêm PhysicalSymptoms
    if (physicalSymptoms.length > 0) {
        const physicalInserts = physicalSymptoms.map(symptom => ({
            Name: symptom.name,
            Description: symptom.description || '',

        }));
        const { data: physData, error: physError } = await supabase
            .from('PhysicalSymptoms')
            .insert(physicalInserts)
            .select('Id');
        if (physError) throw new Error(`Lỗi khi thêm PhysicalSymptoms: ${physError.message}`);

        const physLinks = physData.map(symptom => ({
            MedicalHistoriesId: historyId,
            PhysicalSymptomsId: symptom.Id,

        }));
        if (physLinks.length > 0) {
            const { error: linkPhysError } = await supabase.from('MedicalHistoryPhysicalSymptom').insert(physLinks);
            if (linkPhysError) throw new Error(`Lỗi khi liên kết PhysicalSymptoms: ${linkPhysError.message}`);
        }
    }

    // Thêm MentalDisorders
    if (mentalDisorders.length > 0) {
        const mentalInserts = mentalDisorders.map(disorder => ({
            Name: disorder.name,
            Description: disorder.description || '',

        }));
        const { data: mentalData, error: mentalError } = await supabase
            .from('MentalDisorders')
            .insert(mentalInserts)
            .select('Id');
        if (mentalError) throw new Error(`Lỗi khi thêm MentalDisorders: ${mentalError.message}`);

        const mentalLinks = mentalData.map(disorder => ({
            MedicalHistoriesId: historyId,
            SpecificMentalDisordersId: disorder.Id,

        }));
        if (mentalLinks.length > 0) {
            const { error: linkMentalError } = await supabase.from('MedicalHistorySpecificMentalDisorder').insert(mentalLinks);
            if (linkMentalError) throw new Error(`Lỗi khi liên kết MentalDisorders: ${linkMentalError.message}`);
        }
    }

    return await exports.getMedicalHistory(historyId);
};

exports.getMedicalHistory = async (Id) => {
    if (!Id || typeof Id !== 'string') throw new Error("Id là bắt buộc và phải là chuỗi");
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
        .eq('Id', Id)
        .single();
    if (error) throw new Error(`Lỗi khi lấy MedicalHistory: ${error.message}`);
    return data;
};

exports.getMedicalHistoriesByPatientId = async (patientId) => {
    if (!patientId || typeof patientId !== 'string') throw new Error("patientId là bắt buộc và phải là chuỗi");
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
    if (error) throw new Error(`Lỗi khi lấy MedicalHistories: ${error.message}`);
    return data;
};

exports.updateMedicalHistory = async (Id, { patientId, description, diagnosedAt, lastModifiedBy, physicalSymptoms = [], mentalDisorders = [] }) => {
    // Kiểm tra đầu vào
    validateInput({ patientId, createdBy: lastModifiedBy, lastModifiedBy, physicalSymptoms, mentalDisorders });
    const diagnosedAtDate = validateDateFormat(diagnosedAt);

    // Cập nhật MedicalHistory
    const { data: historyData, error: historyError } = await supabase
        .from('MedicalHistories')
        .update({
            PatientId: patientId,
            Description: description || '',
            DiagnosedAt: diagnosedAtDate.toISOString(),
            LastModifiedBy: lastModifiedBy,
            LastModified: new Date().toISOString()
        })
        .eq('Id', Id)
        .select('Id')
        .single();
    if (historyError) throw new Error(`Lỗi khi cập nhật MedicalHistory: ${historyError.message}`);

    // Xóa liên kết và PhysicalSymptoms cũ
    const { data: oldPhysIds } = await supabase
        .from('MedicalHistoryPhysicalSymptom')
        .select('PhysicalSymptomsId')
        .eq('MedicalHistoriesId', Id);
    if (oldPhysIds?.length > 0) {
        const physIdsToDelete = oldPhysIds.map(item => item.PhysicalSymptomsId);
        await supabase.from('PhysicalSymptoms').delete().in('Id', physIdsToDelete);
    }
    await supabase.from('MedicalHistoryPhysicalSymptom').delete().eq('MedicalHistoriesId', Id);

    // Thêm PhysicalSymptoms mới
    if (physicalSymptoms.length > 0) {
        const physicalInserts = physicalSymptoms.map(symptom => ({
            Name: symptom.name,
            Description: symptom.description || '',

        }));
        const { data: physData, error: physError } = await supabase
            .from('PhysicalSymptoms')
            .insert(physicalInserts)
            .select('Id');
        if (physError) throw new Error(`Lỗi khi thêm PhysicalSymptoms: ${physError.message}`);

        const physLinks = physData.map(symptom => ({
            MedicalHistoriesId: Id,
            PhysicalSymptomsId: symptom.Id,

        }));
        const { error: linkPhysError } = await supabase.from('MedicalHistoryPhysicalSymptom').insert(physLinks);
        if (linkPhysError) throw new Error(`Lỗi khi liên kết PhysicalSymptoms: ${linkPhysError.message}`);
    }

    // Xóa liên kết và MentalDisorders cũ
    const { data: oldMentalIds } = await supabase
        .from('MedicalHistorySpecificMentalDisorder')
        .select('SpecificMentalDisordersId')
        .eq('MedicalHistoriesId', Id);
    if (oldMentalIds?.length > 0) {
        const mentalIdsToDelete = oldMentalIds.map(item => item.SpecificMentalDisordersId);
        await supabase.from('MentalDisorders').delete().in('Id', mentalIdsToDelete);
    }
    await supabase.from('MedicalHistorySpecificMentalDisorder').delete().eq('MedicalHistoriesId', Id);

    // Thêm MentalDisorders mới
    if (mentalDisorders.length > 0) {
        const mentalInserts = mentalDisorders.map(disorder => ({
            Name: disorder.name,
            Description: disorder.description || '',

        }));
        const { data: mentalData, error: mentalError } = await supabase
            .from('MentalDisorders')
            .insert(mentalInserts)
            .select('Id');
        if (mentalError) throw new Error(`Lỗi khi thêm MentalDisorders: ${mentalError.message}`);

        const mentalLinks = mentalData.map(disorder => ({
            MedicalHistoriesId: Id,
            SpecificMentalDisordersId: disorder.Id,

        }));
        const { error: linkMentalError } = await supabase.from('MedicalHistorySpecificMentalDisorder').insert(mentalLinks);
        if (linkMentalError) throw new Error(`Lỗi khi liên kết MentalDisorders: ${linkMentalError.message}`);
    }

    return await exports.getMedicalHistory(Id);
};

exports.updateMedicalHistoriesByPatientId = async (patientId, { description, diagnosedAt, lastModifiedBy, physicalSymptoms = [], mentalDisorders = [] }) => {
    // Kiểm tra đầu vào
    validateInput({ patientId, createdBy: lastModifiedBy, lastModifiedBy, physicalSymptoms, mentalDisorders });
    const diagnosedAtDate = validateDateFormat(diagnosedAt);

    // Cập nhật tất cả MedicalHistories theo patientId
    const { data: historyData, error: historyError } = await supabase
        .from('MedicalHistories')
        .update({
            Description: description || '',
            DiagnosedAt: diagnosedAtDate.toISOString(),
            LastModifiedBy: lastModifiedBy,
            LastModified: new Date().toISOString()
        })
        .eq('PatientId', patientId)
        .select('Id');
    if (historyError) throw new Error(`Lỗi khi cập nhật MedicalHistories: ${historyError.message}`);

    if (historyData?.length > 0) {
        for (const history of historyData) {
            const Id = history.Id;

            // Xóa liên kết và PhysicalSymptoms cũ
            const { data: oldPhysIds } = await supabase
                .from('MedicalHistoryPhysicalSymptom')
                .select('PhysicalSymptomsId')
                .eq('MedicalHistoriesId', Id);
            if (oldPhysIds?.length > 0) {
                const physIdsToDelete = oldPhysIds.map(item => item.PhysicalSymptomsId);
                await supabase.from('PhysicalSymptoms').delete().in('Id', physIdsToDelete);
            }
            await supabase.from('MedicalHistoryPhysicalSymptom').delete().eq('MedicalHistoriesId', Id);

            // Thêm PhysicalSymptoms mới
            if (physicalSymptoms.length > 0) {
                const physicalInserts = physicalSymptoms.map(symptom => ({
                    Name: symptom.name,
                    Description: symptom.description || '',

                }));
                const { data: physData, error: physError } = await supabase
                    .from('PhysicalSymptoms')
                    .insert(physicalInserts)
                    .select('Id');
                if (physError) throw new Error(`Lỗi khi thêm PhysicalSymptoms: ${physError.message}`);

                const physLinks = physData.map(symptom => ({
                    MedicalHistoriesId: Id,
                    PhysicalSymptomsId: symptom.Id,

                }));
                const { error: linkPhysError } = await supabase.from('MedicalHistoryPhysicalSymptom').insert(physLinks);
                if (linkPhysError) throw new Error(`Lỗi khi liên kết PhysicalSymptoms: ${linkPhysError.message}`);
            }

            // Xóa liên kết và MentalDisorders cũ
            const { data: oldMentalIds } = await supabase
                .from('MedicalHistorySpecificMentalDisorder')
                .select('SpecificMentalDisordersId')
                .eq('MedicalHistoriesId', Id);
            if (oldMentalIds?.length > 0) {
                const mentalIdsToDelete = oldMentalIds.map(item => item.SpecificMentalDisordersId);
                await supabase.from('MentalDisorders').delete().in('Id', mentalIdsToDelete);
            }
            await supabase.from('MedicalHistorySpecificMentalDisorder').delete().eq('MedicalHistoriesId', Id);

            // Thêm MentalDisorders mới
            if (mentalDisorders.length > 0) {
                const mentalInserts = mentalDisorders.map(disorder => ({
                    Name: disorder.name,
                    Description: disorder.description || '',

                }));
                const { data: mentalData, error: mentalError } = await supabase
                    .from('MentalDisorders')
                    .insert(mentalInserts)
                    .select('Id');
                if (mentalError) throw new Error(`Lỗi khi thêm MentalDisorders: ${mentalError.message}`);

                const mentalLinks = mentalData.map(disorder => ({
                    MedicalHistoriesId: Id,
                    SpecificMentalDisordersId: disorder.Id,

                }));
                const { error: linkMentalError } = await supabase.from('MedicalHistorySpecificMentalDisorder').insert(mentalLinks);
                if (linkMentalError) throw new Error(`Lỗi khi liên kết MentalDisorders: ${linkMentalError.message}`);
            }
        }
    }

    return await exports.getMedicalHistoriesByPatientId(patientId);
};

exports.deleteMedicalHistory = async (Id) => {
    if (!Id || typeof Id !== 'string') throw new Error("Id là bắt buộc và phải là chuỗi");

    // Xóa liên kết và PhysicalSymptoms
    const { data: oldPhysIds } = await supabase
        .from('MedicalHistoryPhysicalSymptom')
        .select('PhysicalSymptomsId')
        .eq('MedicalHistoriesId', Id);
    if (oldPhysIds?.length > 0) {
        const physIdsToDelete = oldPhysIds.map(item => item.PhysicalSymptomsId);
        const { error: physError } = await supabase.from('PhysicalSymptoms').delete().in('Id', physIdsToDelete);
        if (physError) throw new Error(`Lỗi khi xóa PhysicalSymptoms: ${physError.message}`);
    }
    const { error: physLinkError } = await supabase.from('MedicalHistoryPhysicalSymptom').delete().eq('MedicalHistoriesId', Id);
    if (physLinkError) throw new Error(`Lỗi khi xóa liên kết PhysicalSymptoms: ${physLinkError.message}`);

    // Xóa liên kết và MentalDisorders
    const { data: oldMentalIds } = await supabase
        .from('MedicalHistorySpecificMentalDisorder')
        .select('SpecificMentalDisordersId')
        .eq('MedicalHistoriesId', Id);
    if (oldMentalIds?.length > 0) {
        const mentalIdsToDelete = oldMentalIds.map(item => item.SpecificMentalDisordersId);
        const { error: mentalError } = await supabase.from('MentalDisorders').delete().in('Id', mentalIdsToDelete);
        if (mentalError) throw new Error(`Lỗi khi xóa MentalDisorders: ${mentalError.message}`);
    }
    const { error: specLinkError } = await supabase.from('MedicalHistorySpecificMentalDisorder').delete().eq('MedicalHistoriesId', Id);
    if (specLinkError) throw new Error(`Lỗi khi xóa liên kết MentalDisorders: ${specLinkError.message}`);

    // Xóa MedicalHistory
    const { error } = await supabase.from('MedicalHistories').delete().eq('Id', Id);
    if (error) throw new Error(`Lỗi khi xóa MedicalHistory: ${error.message}`);
};