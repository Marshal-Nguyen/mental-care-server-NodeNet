const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.createMedicalRecord = async ({ patientId, doctorId, bookingId, description, diagnosedAt, createdBy, lastModifiedBy, mentalDisorders = [] }) => {
    const cleanedDiagnosedAt = diagnosedAt ? diagnosedAt.trim() : null;
    if (!cleanedDiagnosedAt) throw new Error("diagnosedAt is required");
    const [year, month, day] = cleanedDiagnosedAt.split('-');
    const diagnosedAtDate = new Date(year, month - 1, day);
    if (isNaN(diagnosedAtDate.getTime())) throw new Error(`Invalid diagnosedAt date (expected yyyy-mm-dd): ${diagnosedAt}`);

    // Check for existing record with the same bookingId and delete it
    const { data: existingRecord, error: fetchError } = await supabase
        .from('MedicalRecords')
        .select('Id')
        .eq('BookingId', bookingId)
        .single();
    if (fetchError && fetchError.code !== 'PGRST116') throw new Error(`Error checking existing record: ${fetchError.message}`);

    if (existingRecord) {
        // Delete associated mental disorders and links
        const { data: oldMentalIds } = await supabase
            .from('MedicalRecordSpecificMentalDisorder')
            .select('SpecificMentalDisordersId')
            .eq('MedicalRecordsId', existingRecord.Id);
        if (oldMentalIds && oldMentalIds.length > 0) {
            const mentalIdsToDelete = oldMentalIds.map(item => item.SpecificMentalDisordersId);
            await supabase.from('MentalDisorders').delete().in('Id', mentalIdsToDelete);
        }
        await supabase.from('MedicalRecordSpecificMentalDisorder').delete().eq('MedicalRecordsId', existingRecord.Id);

        // Delete the existing record
        const { error: deleteError } = await supabase
            .from('MedicalRecords')
            .delete()
            .eq('Id', existingRecord.Id);
        if (deleteError) throw new Error(`Delete existing record error: ${deleteError.message}`);
    }

    // Create new MedicalRecord
    const { data: recordData, error: recordError } = await supabase
        .from('MedicalRecords')
        .insert({
            PatientId: patientId,
            DoctorId: doctorId,
            BookingId: bookingId,
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

    // Handle mentalDisorders
    if (mentalDisorders && Array.isArray(mentalDisorders) && mentalDisorders.length > 0) {
        const mentalInserts = mentalDisorders.map(disorder => ({
            Name: disorder.name || '',
            Description: disorder.description || ''
        }));
        const { data: mentalData, error: mentalError } = await supabase
            .from('MentalDisorders')
            .insert(mentalInserts)
            .select();
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
            .from('MentalDisorders')
            .select('*')
            .in('Id', mentalDisorderIds);
        if (mentalError) throw new Error(`Fetch mental disorders error: ${mentalError.message}`);
        mentalDisorders = mentalData;
    }

    return {
        ...record,
        MedicalRecordSpecificMentalDisorder: links.map(link => ({
            SpecificMentalDisordersId: link.SpecificMentalDisordersId,
            MentalDisorders: mentalDisorders.find(md => md.Id === link.SpecificMentalDisordersId) || null
        }))
    };
};

exports.getMedicalRecordByBookingId = async (bookingId) => {
    const { data: record, error: recordError } = await supabase
        .from('MedicalRecords')
        .select('*')
        .eq('BookingId', bookingId)
        .single();
    if (recordError) throw new Error(`Fetch record by bookingId error: ${recordError.message}`);

    const { data: links, error: linkError } = await supabase
        .from('MedicalRecordSpecificMentalDisorder')
        .select('SpecificMentalDisordersId')
        .eq('MedicalRecordsId', record.Id);
    if (linkError) throw new Error(`Fetch links error: ${linkError.message}`);

    let mentalDisorders = [];
    if (links && links.length > 0) {
        const mentalDisorderIds = links.map(link => link.SpecificMentalDisordersId);
        const { data: mentalData, error: mentalError } = await supabase
            .from('MentalDisorders')
            .select('*')
            .in('Id', mentalDisorderIds);
        if (mentalError) throw new Error(`Fetch mental disorders error: ${mentalError.message}`);
        mentalDisorders = mentalData;
    }

    return {
        ...record,
        MedicalRecordSpecificMentalDisorder: links.map(link => ({
            SpecificMentalDisordersId: link.SpecificMentalDisordersId,
            MentalDisorders: mentalDisorders.find(md => md.Id === link.SpecificMentalDisordersId) || null
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
            .from('MentalDisorders')
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
                MentalDisorders: mentalDisorders.find(md => md.Id === link.SpecificMentalDisordersId) || null
            }))
    }));
};

exports.getMedicalRecordsByDoctorId = async (doctorId) => {
    const { data: records, error: recordError } = await supabase
        .from('MedicalRecords')
        .select('*')
        .eq('DoctorId', doctorId);
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
            .from('MentalDisorders')
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
                MentalDisorders: mentalDisorders.find(md => md.Id === link.SpecificMentalDisordersId) || null
            }))
    }));
};

exports.updateMedicalRecord = async (Id, { patientId, doctorId, bookingId, description, diagnosedAt, lastModifiedBy, mentalDisorders }) => {
    const cleanedDiagnosedAt = diagnosedAt ? diagnosedAt.trim() : null;
    if (!cleanedDiagnosedAt) throw new Error("diagnosedAt is required");
    const diagnosedAtDate = new Date(cleanedDiagnosedAt);
    if (isNaN(diagnosedAtDate.getTime())) throw new Error(`Invalid diagnosedAt date: ${diagnosedAt}`);

    const { data: recordData, error: recordError } = await supabase
        .from('MedicalRecords')
        .update({
            PatientId: patientId,
            DoctorId: doctorId,
            BookingId: bookingId,
            Description: description,
            DiagnosedAt: diagnosedAtDate,
            LastModifiedBy: lastModifiedBy,
            LastModified: new Date()
        })
        .eq('Id', Id)
        .select();
    if (recordError) throw new Error(`Update record error: ${recordError.message}`);

    if (mentalDisorders && Array.isArray(mentalDisorders) && mentalDisorders.length > 0) {
        // Delete old links
        await supabase.from('MedicalRecordSpecificMentalDisorder').delete().eq('MedicalRecordsId', Id);

        // Insert new mental disorders
        const mentalInserts = mentalDisorders.map(disorder => ({
            Name: disorder.name || '',
            Description: disorder.description || ''
        }));
        const { data: mentalData, error: mentalError } = await supabase
            .from('MentalDisorders')
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

exports.updateMedicalRecordsByPatientId = async (patientId, { description, diagnosedAt, lastModifiedBy, mentalDisorders }) => {
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
                await supabase.from('MentalDisorders').delete().in('Id', mentalIdsToDelete);
            }
            await supabase.from('MedicalRecordSpecificMentalDisorder').delete().eq('MedicalRecordsId', Id);

            if (mentalDisorders && Array.isArray(mentalDisorders) && mentalDisorders.length > 0) {
                const mentalInserts = mentalDisorders.map(disorder => ({
                    Name: disorder.name || '',
                    Description: disorder.description || ''
                }));
                const { data: mentalData, error: mentalError } = await supabase
                    .from('MentalDisorders')
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
        await supabase.from('MentalDisorders').delete().in('Id', mentalIdsToDelete);
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