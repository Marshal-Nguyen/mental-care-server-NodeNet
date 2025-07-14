const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.createMedicalRecord = async ({ patientId, doctorId, medicalHistoryId, description, diagnosedAt, createdBy, lastModifiedBy, specificMentalDisorders = [] }) => {
    const cleanedDiagnosedAt = diagnosedAt ? diagnosedAt.trim() : null;
    if (!cleanedDiagnosedAt) throw new Error("diagnosedAt is required");
    const [year, month, day] = cleanedDiagnosedAt.split('-');
    const diagnosedAtDate = new Date(year, month - 1, day);
    if (isNaN(diagnosedAtDate.getTime())) throw new Error(`Invalid diagnosedAt date (expected yyyy-mm-dd): ${diagnosedAt}`);

    // Tạo bản ghi MedicalRecords
    const { data: recordData, error: recordError } = await supabase
        .from('MedicalRecords')
        .insert({
            PatientId: patientId,
            DoctorId: doctorId,
            MedicalHistoryId: medicalHistoryId,
            Description: description,
            DiagnosedAt: diagnosedAtDate,
            CreatedBy: createdBy,
            LastModifiedBy: lastModifiedBy,
            CreatedAt: new Date(),
            LastModified: new Date()
        })
        .select();
    if (recordError) throw new Error(`Database error creating MedicalRecord: ${recordError.message}`);
    const recordId = recordData[0].Id;

    // Xử lý specificMentalDisorders
    if (specificMentalDisorders && Array.isArray(specificMentalDisorders) && specificMentalDisorders.length > 0) {
        const mentalInserts = specificMentalDisorders.map(disorder => ({
            Name: disorder.name || '',
            Description: disorder.description || ''
        }));
        const { data: mentalData, error: mentalError } = await supabase
            .from('SpecificMentalDisorders')
            .insert(mentalInserts)
            .select(); // Lấy Id của các bản ghi mới
        if (mentalError) throw new Error(`Insert mental disorders error: ${mentalError.message}`);

        if (mentalData && mentalData.length > 0) {
            const mentalLinks = mentalData.map(mental => ({
                MedicalRecordsId: recordId,
                SpecificMentalDisordersId: mental.Id
            }));
            if (mentalLinks.length > 0) {
                const { error: linkError } = await supabase
                    .from('MedicalRecordSpecificMentalDisorder')
                    .insert(mentalLinks);
                if (linkError) throw new Error(`Link mental disorders error: ${linkError.message}`);
            }
        }
    }

    return await this.getMedicalRecord(recordId);
};

exports.getMedicalRecord = async (Id) => {
    const { data: record, error: recordError } = await supabase
        .from('MedicalRecords')
        .select('*')
        .eq('Id', Id)
        .single();
    if (recordError) throw new Error(`Fetch record error: ${recordError.message}`);

    const { data: links, error: linkError } = await supabase
        .from('MedicalRecordSpecificMentalDisorder')
        .select('SpecificMentalDisordersId')
        .eq('MedicalRecordsId', Id);
    if (linkError) throw new Error(`Fetch links error: ${linkError.message}`);

    let mentalDisorders = [];
    if (links && links.length > 0) {
        const mentalDisorderIds = links.map(link => link.SpecificMentalDisordersId);
        const { data: mentalData, error: mentalError } = await supabase
            .from('SpecificMentalDisorders')
            .select('*')
            .in('Id', mentalDisorderIds);
        if (mentalError) throw new Error(`Fetch mental disorders error: ${mentalError.message}`);
        mentalDisorders = mentalData;
    }

    return {
        ...record,
        MedicalRecordSpecificMentalDisorder: links.map(link => ({
            SpecificMentalDisordersId: link.SpecificMentalDisordersId,
            SpecificMentalDisorders: mentalDisorders.find(md => md.Id === link.SpecificMentalDisordersId) || null
        }))
    };
};

exports.getMedicalRecordsByPatientId = async (patientId) => {
    const { data: records, error: recordError } = await supabase
        .from('MedicalRecords')
        .select('*')
        .eq('PatientId', patientId);
    if (recordError) throw new Error(`Fetch records error: ${recordError.message}`);

    const recordIds = records.map(r => r.Id);
    let allLinks = [];
    if (recordIds.length > 0) {
        const { data: links, error: linkError } = await supabase
            .from('MedicalRecordSpecificMentalDisorder')
            .select('MedicalRecordsId, SpecificMentalDisordersId')
            .in('MedicalRecordsId', recordIds);
        if (linkError) throw new Error(`Fetch links error: ${linkError.message}`);
        allLinks = links || [];
    }

    const mentalDisorderIds = [...new Set(allLinks.map(link => link.SpecificMentalDisordersId))];
    let mentalDisorders = [];
    if (mentalDisorderIds.length > 0) {
        const { data: mentalData, error: mentalError } = await supabase
            .from('SpecificMentalDisorders')
            .select('*')
            .in('Id', mentalDisorderIds);
        if (mentalError) throw new Error(`Fetch mental disorders error: ${mentalError.message}`);
        mentalDisorders = mentalData || [];
    }

    return records.map(record => ({
        ...record,
        MedicalRecordSpecificMentalDisorder: allLinks
            .filter(link => link.MedicalRecordsId === record.Id)
            .map(link => ({
                SpecificMentalDisordersId: link.SpecificMentalDisordersId,
                SpecificMentalDisorders: mentalDisorders.find(md => md.Id === link.SpecificMentalDisordersId) || null
            }))
    }));
};

exports.updateMedicalRecord = async (Id, { patientId, doctorId, medicalHistoryId, description, diagnosedAt, lastModifiedBy, specificMentalDisorders }) => {
    const cleanedDiagnosedAt = diagnosedAt ? diagnosedAt.trim() : null;
    if (!cleanedDiagnosedAt) throw new Error("diagnosedAt is required");
    const diagnosedAtDate = new Date(cleanedDiagnosedAt);
    if (isNaN(diagnosedAtDate.getTime())) throw new Error(`Invalid diagnosedAt date: ${diagnosedAt}`);

    const { data: recordData, error: recordError } = await supabase
        .from('MedicalRecords')
        .update({
            PatientId: patientId,
            DoctorId: doctorId,
            MedicalHistoryId: medicalHistoryId,
            Description: description,
            DiagnosedAt: diagnosedAtDate,
            LastModifiedBy: lastModifiedBy,
            LastModified: new Date()
        })
        .eq('Id', Id)
        .select();
    if (recordError) throw new Error(`Update record error: ${recordError.message}`);

    if (specificMentalDisorders && Array.isArray(specificMentalDisorders) && specificMentalDisorders.length > 0) {
        // Xóa các liên kết cũ
        await supabase.from('MedicalRecordSpecificMentalDisorder').delete().eq('MedicalRecordsId', Id);

        // Chèn các rối loạn tâm thần mới
        const mentalInserts = specificMentalDisorders.map(disorder => ({
            Name: disorder.name || '',
            Description: disorder.description || ''
        }));
        const { data: mentalData, error: mentalError } = await supabase
            .from('SpecificMentalDisorders')
            .insert(mentalInserts)
            .select();
        if (mentalError) throw new Error(`Insert mental disorders error: ${mentalError.message}`);

        if (mentalData && mentalData.length > 0) {
            const mentalLinks = mentalData.map(mental => ({
                MedicalRecordsId: Id,
                SpecificMentalDisordersId: mental.Id
            }));
            const { error: linkError } = await supabase
                .from('MedicalRecordSpecificMentalDisorder')
                .insert(mentalLinks);
            if (linkError) throw new Error(`Link mental disorders error: ${linkError.message}`);
        }
    }

    return await this.getMedicalRecord(Id);
};

exports.updateMedicalRecordsByPatientId = async (patientId, { description, diagnosedAt, lastModifiedBy, specificMentalDisorders }) => {
    const cleanedDiagnosedAt = diagnosedAt ? diagnosedAt.trim() : null;
    if (!cleanedDiagnosedAt) throw new Error("diagnosedAt is required");
    const diagnosedAtDate = new Date(cleanedDiagnosedAt);
    if (isNaN(diagnosedAtDate.getTime())) throw new Error(`Invalid diagnosedAt date: ${diagnosedAt}`);

    const { data: recordData, error: recordError } = await supabase
        .from('MedicalRecords')
        .update({
            Description: description,
            DiagnosedAt: diagnosedAtDate,
            LastModifiedBy: lastModifiedBy,
            LastModified: new Date()
        })
        .eq('PatientId', patientId)
        .select();
    if (recordError) throw new Error(`Update records error: ${recordError.message}`);

    if (recordData && recordData.length > 0) {
        for (const record of recordData) {
            const Id = record.Id;

            const { data: oldMentalIds } = await supabase
                .from('MedicalRecordSpecificMentalDisorder')
                .select('SpecificMentalDisordersId')
                .eq('MedicalRecordsId', Id);
            if (oldMentalIds && oldMentalIds.length > 0) {
                const mentalIdsToDelete = oldMentalIds.map(item => item.SpecificMentalDisordersId);
                await supabase.from('SpecificMentalDisorders').delete().in('Id', mentalIdsToDelete);
            }
            await supabase.from('MedicalRecordSpecificMentalDisorder').delete().eq('MedicalRecordsId', Id);

            if (specificMentalDisorders && Array.isArray(specificMentalDisorders) && specificMentalDisorders.length > 0) {
                const mentalInserts = specificMentalDisorders.map(disorder => ({
                    Name: disorder.name || '',
                    Description: disorder.description || ''
                }));
                const { data: mentalData, error: mentalError } = await supabase
                    .from('SpecificMentalDisorders')
                    .insert(mentalInserts)
                    .select();
                if (mentalError) throw new Error(`Insert mental disorders error: ${mentalError.message}`);

                if (mentalData && mentalData.length > 0) {
                    const mentalLinks = mentalData.map(mental => ({
                        MedicalRecordsId: Id,
                        SpecificMentalDisordersId: mental.Id
                    }));
                    const { error: linkError } = await supabase
                        .from('MedicalRecordSpecificMentalDisorder')
                        .insert(mentalLinks);
                    if (linkError) throw new Error(`Link mental disorders error: ${linkError.message}`);
                }
            }
        }
    }

    return await this.getMedicalRecordsByPatientId(patientId);
};

exports.deleteMedicalRecord = async (Id) => {
    const { data: oldMentalIds } = await supabase
        .from('MedicalRecordSpecificMentalDisorder')
        .select('SpecificMentalDisordersId')
        .eq('MedicalRecordsId', Id);
    if (oldMentalIds && oldMentalIds.length > 0) {
        const mentalIdsToDelete = oldMentalIds.map(item => item.SpecificMentalDisordersId);
        await supabase.from('SpecificMentalDisorders').delete().in('Id', mentalIdsToDelete);
    }
    const { error: specLinkError } = await supabase
        .from('MedicalRecordSpecificMentalDisorder')
        .delete()
        .eq('MedicalRecordsId', Id);
    if (specLinkError) throw new Error(`Delete mental disorder links error: ${specLinkError.message}`);

    const { error } = await supabase
        .from('MedicalRecords')
        .delete()
        .eq('Id', Id);
    if (error) throw new Error(`Delete record error: ${error.message}`);
};