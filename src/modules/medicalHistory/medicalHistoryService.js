const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.createMedicalHistory = async ({ patientId, description, diagnosedAt, createdBy, lastModifiedBy, physicalSymptoms = [], specificMentalDisorders = [] }) => {
    const cleanedDiagnosedAt = diagnosedAt ? diagnosedAt.trim() : null;
    if (!cleanedDiagnosedAt) throw new Error("diagnosedAt is required");
    const [year, month, day] = cleanedDiagnosedAt.split('-');
    const diagnosedAtDate = new Date(year, month - 1, day);
    if (isNaN(diagnosedAtDate.getTime())) throw new Error("Invalid diagnosedAt date (expected yyyy-mm-dd)");

    const { data: historyData, error: historyError } = await supabase
        .from('MedicalHistories')
        .insert({
            PatientId: patientId,
            Description: description,
            DiagnosedAt: diagnosedAtDate,
            CreatedBy: createdBy,
            LastModifiedBy: lastModifiedBy,
            CreatedAt: new Date(),
            LastModified: new Date()
        })
        .select();
    if (historyError) throw new Error(historyError.message);

    const historyId = historyData[0].Id;

    // Thêm PhysicalSymptoms
    if (physicalSymptoms && Array.isArray(physicalSymptoms) && physicalSymptoms.length > 0) {
        const physicalInserts = physicalSymptoms.map(symptom => ({
            Name: symptom.name || '',
            Description: symptom.description || '',
        }));
        const { error: physError } = await supabase.from('PhysicalSymptoms').insert(physicalInserts);
        if (physError) throw new Error(physError.message);

        const physData = await supabase.from('PhysicalSymptoms').select('Id').order('Id', { ascending: false }).limit(physicalSymptoms.length);
        if (physData && physData.data && physData.data.length > 0) {
            const physLinks = physData.data.map((symptom, index) => ({
                MedicalHistoriesId: historyId,
                PhysicalSymptomsId: symptom.Id,
            }));
            if (physLinks.length > 0) {
                const { error: linkPhysError } = await supabase.from('MedicalHistoryPhysicalSymptom').insert(physLinks);
                if (linkPhysError) throw new Error(linkPhysError.message);
            }
        }
    }

    // Thêm SpecificMentalDisorders
    if (specificMentalDisorders && Array.isArray(specificMentalDisorders) && specificMentalDisorders.length > 0) {
        const mentalInserts = specificMentalDisorders.map(disorder => ({
            Name: disorder.name || '',
            Description: disorder.description || '',
        }));
        const { error: mentalError } = await supabase.from('SpecificMentalDisorders').insert(mentalInserts);
        if (mentalError) throw new Error(mentalError.message);

        const mentalData = await supabase.from('SpecificMentalDisorders').select('Id').order('Id', { ascending: false }).limit(specificMentalDisorders.length);
        if (mentalData && mentalData.data && mentalData.data.length > 0) {
            const mentalLinks = mentalData.data.map((disorder, index) => ({
                MedicalHistoriesId: historyId,
                SpecificMentalDisordersId: disorder.Id,
            }));
            if (mentalLinks.length > 0) {
                const { error: linkMentalError } = await supabase.from('MedicalHistorySpecificMentalDisorder').insert(mentalLinks);
                if (linkMentalError) throw new Error(linkMentalError.message);
            }
        }
    }
    return await this.getMedicalHistory(historyId);
};

exports.getMedicalHistory = async (Id) => {
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
        SpecificMentalDisorders (*)
      )
    `)
        .eq('Id', Id)
        .single();
    if (error) throw new Error(error.message);
    return data;
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
        SpecificMentalDisorders (*)
      )
    `)
        .eq('PatientId', patientId);
    if (error) throw new Error(error.message);
    return data;
};

exports.updateMedicalHistory = async (Id, { patientId, description, diagnosedAt, lastModifiedBy, physicalSymptoms, specificMentalDisorders }) => {
    const cleanedDiagnosedAt = diagnosedAt ? diagnosedAt.trim() : null;
    if (!cleanedDiagnosedAt) throw new Error("diagnosedAt is required");
    const diagnosedAtDate = new Date(cleanedDiagnosedAt);
    if (isNaN(diagnosedAtDate.getTime())) throw new Error("Invalid diagnosedAt date");

    const { data: historyData, error: historyError } = await supabase
        .from('MedicalHistories')
        .update({
            PatientId: patientId,
            Description: description,
            DiagnosedAt: diagnosedAtDate,
            LastModifiedBy: lastModifiedBy,
            LastModified: new Date()
        })
        .eq('Id', Id)
        .select();
    if (historyError) throw new Error(historyError.message);

    // Cập nhật PhysicalSymptoms
    if (physicalSymptoms && physicalSymptoms.length > 0) {
        await supabase.from('MedicalHistoryPhysicalSymptom').delete().eq('MedicalHistoriesId', Id);
        const physicalInserts = physicalSymptoms.map(symptom => ({
            Name: symptom.name,
            Description: symptom.description,
            CreatedAt: new Date(),
            LastModified: new Date(),
            CreatedBy: lastModifiedBy,
            LastModifiedBy: lastModifiedBy
        }));
        const { error: physError } = await supabase.from('PhysicalSymptoms').insert(physicalInserts);
        if (physError) throw new Error(physError.message);

        const physData = await supabase.from('PhysicalSymptoms').select('Id').order('Id', { ascending: false }).limit(physicalSymptoms.length);
        if (physData && physData.data && physData.data.length > 0) {
            const physLinks = physData.data.map((symptom, index) => ({
                MedicalHistoriesId: Id,
                PhysicalSymptomsId: symptom.Id,
                CreatedAt: new Date(),
                LastModified: new Date(),
                CreatedBy: lastModifiedBy,
                LastModifiedBy: lastModifiedBy
            }));
            const { error: linkPhysError } = await supabase.from('MedicalHistoryPhysicalSymptom').insert(physLinks);
            if (linkPhysError) throw new Error(linkPhysError.message);
        }
    }

    // Cập nhật SpecificMentalDisorders
    if (specificMentalDisorders && specificMentalDisorders.length > 0) {
        await supabase.from('MedicalHistorySpecificMentalDisorder').delete().eq('MedicalHistoriesId', Id);
        const mentalInserts = specificMentalDisorders.map(disorder => ({
            Name: disorder.name,
            Description: disorder.description,
            CreatedAt: new Date(),
            LastModified: new Date(),
            CreatedBy: lastModifiedBy,
            LastModifiedBy: lastModifiedBy
        }));
        const { error: mentalError } = await supabase.from('SpecificMentalDisorders').insert(mentalInserts);
        if (mentalError) throw new Error(mentalError.message);

        const mentalData = await supabase.from('SpecificMentalDisorders').select('Id').order('Id', { ascending: false }).limit(specificMentalDisorders.length);
        if (mentalData && mentalData.data && mentalData.data.length > 0) {
            const mentalLinks = mentalData.data.map((disorder, index) => ({
                MedicalHistoriesId: Id,
                SpecificMentalDisordersId: disorder.Id,
                CreatedAt: new Date(),
                LastModified: new Date(),
                CreatedBy: lastModifiedBy,
                LastModifiedBy: lastModifiedBy
            }));
            const { error: linkMentalError } = await supabase.from('MedicalHistorySpecificMentalDisorder').insert(mentalLinks);
            if (linkMentalError) throw new Error(linkMentalError.message);
        }
    }

    return await this.getMedicalHistory(Id);
};

exports.updateMedicalHistoriesByPatientId = async (patientId, { description, diagnosedAt, lastModifiedBy, physicalSymptoms, specificMentalDisorders }) => {
    const cleanedDiagnosedAt = diagnosedAt ? diagnosedAt.trim() : null;
    if (!cleanedDiagnosedAt) throw new Error("diagnosedAt is required");
    const diagnosedAtDate = new Date(cleanedDiagnosedAt);
    if (isNaN(diagnosedAtDate.getTime())) throw new Error("Invalid diagnosedAt date");

    const { data: historyData, error: historyError } = await supabase
        .from('MedicalHistories')
        .update({
            Description: description,
            DiagnosedAt: diagnosedAtDate,
            LastModifiedBy: lastModifiedBy,
            LastModified: new Date()
        })
        .eq('PatientId', patientId)
        .select();
    if (historyError) throw new Error(historyError.message);

    if (historyData && historyData.length > 0) {
        for (const history of historyData) {
            const Id = history.Id;

            // Lấy danh sách Id của PhysicalSymptoms cũ
            const { data: oldPhysIds } = await supabase
                .from('MedicalHistoryPhysicalSymptom')
                .select('PhysicalSymptomsId')
                .eq('MedicalHistoriesId', Id);
            if (oldPhysIds && oldPhysIds.length > 0) {
                const physIdsToDelete = oldPhysIds.map(item => item.PhysicalSymptomsId);
                await supabase.from('PhysicalSymptoms').delete().in('Id', physIdsToDelete);
            }
            // Xóa liên kết PhysicalSymptoms cũ
            await supabase.from('MedicalHistoryPhysicalSymptom').delete().eq('MedicalHistoriesId', Id);

            // Thêm PhysicalSymptoms mới
            if (physicalSymptoms && physicalSymptoms.length > 0) {
                const physicalInserts = physicalSymptoms.map(symptom => ({
                    Name: symptom.name,
                    Description: symptom.description,
                }));
                const { error: physError } = await supabase.from('PhysicalSymptoms').insert(physicalInserts);
                if (physError) throw new Error(physError.message);

                const physData = await supabase.from('PhysicalSymptoms').select('Id').order('Id', { ascending: false }).limit(physicalSymptoms.length);
                if (physData && physData.data && physData.data.length > 0) {
                    const physLinks = physData.data.map((symptom, index) => ({
                        MedicalHistoriesId: Id,
                        PhysicalSymptomsId: symptom.Id,
                    }));
                    const { error: linkPhysError } = await supabase.from('MedicalHistoryPhysicalSymptom').insert(physLinks);
                    if (linkPhysError) throw new Error(linkPhysError.message);
                }
            }

            // Lấy danh sách Id của SpecificMentalDisorders cũ
            const { data: oldMentalIds } = await supabase
                .from('MedicalHistorySpecificMentalDisorder')
                .select('SpecificMentalDisordersId')
                .eq('MedicalHistoriesId', Id);
            if (oldMentalIds && oldMentalIds.length > 0) {
                const mentalIdsToDelete = oldMentalIds.map(item => item.SpecificMentalDisordersId);
                await supabase.from('SpecificMentalDisorders').delete().in('Id', mentalIdsToDelete);
            }
            // Xóa liên kết SpecificMentalDisorders cũ
            await supabase.from('MedicalHistorySpecificMentalDisorder').delete().eq('MedicalHistoriesId', Id);

            // Thêm SpecificMentalDisorders mới
            if (specificMentalDisorders && specificMentalDisorders.length > 0) {
                const mentalInserts = specificMentalDisorders.map(disorder => ({
                    Name: disorder.name,
                    Description: disorder.description,
                }));
                const { error: mentalError } = await supabase.from('SpecificMentalDisorders').insert(mentalInserts);
                if (mentalError) throw new Error(mentalError.message);

                const mentalData = await supabase.from('SpecificMentalDisorders').select('Id').order('Id', { ascending: false }).limit(specificMentalDisorders.length);
                if (mentalData && mentalData.data && mentalData.data.length > 0) {
                    const mentalLinks = mentalData.data.map((disorder, index) => ({
                        MedicalHistoriesId: Id,
                        SpecificMentalDisordersId: disorder.Id,
                    }));
                    const { error: linkMentalError } = await supabase.from('MedicalHistorySpecificMentalDisorder').insert(mentalLinks);
                    if (linkMentalError) throw new Error(linkMentalError.message);
                }
            }
        }
    }

    return await this.getMedicalHistoriesByPatientId(patientId);
};
exports.deleteMedicalHistory = async (Id) => {
    // Lấy danh sách Id của PhysicalSymptoms cũ
    const { data: oldPhysIds } = await supabase
        .from('MedicalHistoryPhysicalSymptom')
        .select('PhysicalSymptomsId')
        .eq('MedicalHistoriesId', Id);
    if (oldPhysIds && oldPhysIds.length > 0) {
        const physIdsToDelete = oldPhysIds.map(item => item.PhysicalSymptomsId);
        await supabase.from('PhysicalSymptoms').delete().in('Id', physIdsToDelete);
    }
    // Xóa liên kết PhysicalSymptoms
    const { error: physLinkError } = await supabase.from('MedicalHistoryPhysicalSymptom').delete().eq('MedicalHistoriesId', Id);
    if (physLinkError) throw new Error(physLinkError.message);

    // Lấy danh sách Id của SpecificMentalDisorders cũ
    const { data: oldMentalIds } = await supabase
        .from('MedicalHistorySpecificMentalDisorder')
        .select('SpecificMentalDisordersId')
        .eq('MedicalHistoriesId', Id);
    if (oldMentalIds && oldMentalIds.length > 0) {
        const mentalIdsToDelete = oldMentalIds.map(item => item.SpecificMentalDisordersId);
        await supabase.from('SpecificMentalDisorders').delete().in('Id', mentalIdsToDelete);
    }
    // Xóa liên kết SpecificMentalDisorders
    const { error: specLinkError } = await supabase.from('MedicalHistorySpecificMentalDisorder').delete().eq('MedicalHistoriesId', Id);
    if (specLinkError) throw new Error(specLinkError.message);

    // Xóa bản ghi MedicalHistories
    const { error } = await supabase.from('MedicalHistories').delete().eq('Id', Id);
    if (error) throw new Error(error.message);
};