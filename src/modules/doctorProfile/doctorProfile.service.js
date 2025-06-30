const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.getAllDoctorProfiles = async (pageIndex = 1, pageSize = 10, sortBy = 'FullName', sortOrder = 'asc', specialtiesId = null) => {
    const start = (pageIndex - 1) * pageSize;
    const end = start + pageSize - 1;

    const validSortFields = ['FullName', 'Gender'];
    const validSortOrders = ['asc', 'desc'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'FullName';
    const order = validSortOrders.includes(sortOrder) ? sortOrder : 'asc';

    let query = supabase
        .from('DoctorProfiles')
        .select(`
            Id,
            UserId,
            FullName,
            Gender,
            Qualifications,
            YearsOfExperience,
            Bio,
            Rating,
            TotalReviews,
            Address,
            Email,
            PhoneNumber,
            CreatedAt,
            CreatedBy,
            LastModified,
            LastModifiedBy,
            Status,
            DoctorProfileSpecialty (
                SpecialtiesId,
                Specialties (Id, Name)
            )
        `, { count: 'exact' })
        .order(sortField, { ascending: order === 'asc' })
        .range(start, end);

    if (specialtiesId) {
        query = query.filter('DoctorProfileSpecialty.SpecialtiesId', 'eq', specialtiesId).not('DoctorProfileSpecialty', 'is', null);
    }

    const { data, error: dataError, count } = await query;
    if (dataError) throw dataError;

    const processedData = data.map(profile => {
        const specialties = profile.DoctorProfileSpecialty.map(s => ({
            Id: s.Specialties.Id,
            Name: s.Specialties.Name
        }));
        const { DoctorProfileSpecialty, ...rest } = profile;
        return { ...rest, specialties };
    });

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
        data: processedData,
        pageIndex,
        pageSize,
        totalCount,
        totalPages,
    };
};

exports.searchDoctorProfilesByName = async (fullName = '', pageIndex = 1, pageSize = 10, sortBy = 'FullName', sortOrder = 'asc', specialtiesId = null) => {
    const start = (pageIndex - 1) * pageSize;
    const end = start + pageSize - 1;

    const validSortFields = ['FullName', 'Gender'];
    const validSortOrders = ['asc', 'desc'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'FullName';
    const order = validSortOrders.includes(sortOrder) ? sortOrder : 'asc';

    let query = supabase
        .from('DoctorProfiles')
        .select(`
            Id,
            UserId,
            FullName,
            Gender,
            Qualifications,
            YearsOfExperience,
            Bio,
            Rating,
            TotalReviews,
            Address,
            Email,
            PhoneNumber,
            CreatedAt,
            CreatedBy,
            LastModified,
            LastModifiedBy,
            Status,
            DoctorProfileSpecialty (
                SpecialtiesId,
                Specialties (Id, Name)
            )
        `, { count: 'exact' })
        .order(sortField, { ascending: order === 'asc' })
        .range(start, end);

    if (fullName.trim()) {
        query = query.ilike('FullName', `%${fullName}%`);
    }

    if (specialtiesId) {
        query = query.filter('DoctorProfileSpecialty.SpecialtiesId', 'eq', specialtiesId).not('DoctorProfileSpecialty', 'is', null);
    }

    const { data, error: dataError, count } = await query;
    if (dataError) throw dataError;

    const processedData = data.map(profile => {
        const specialties = profile.DoctorProfileSpecialty.map(s => ({
            Id: s.Specialties.Id,
            Name: s.Specialties.Name
        }));
        const { DoctorProfileSpecialty, ...rest } = profile;
        return { ...rest, specialties };
    });

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
        data: processedData,
        pageIndex,
        pageSize,
        totalCount,
        totalPages,
    };
};

exports.getDoctorProfileById = async (id) => {
    const { data, error } = await supabase
        .from('DoctorProfiles')
        .select(`
            Id,
            UserId,
            FullName,
            Gender,
            Qualifications,
            YearsOfExperience,
            Bio,
            Rating,
            TotalReviews,
            Address,
            Email,
            PhoneNumber,
            CreatedAt,
            CreatedBy,
            LastModified,
            LastModifiedBy,
            Status,
            DoctorProfileSpecialty (
                SpecialtiesId,
                Specialties (Id, Name)
            )
        `)
        .eq('Id', id)
        .single();
    if (error) throw error;
    if (!data) throw new Error('Bác sĩ không tồn tại');

    const specialties = data.DoctorProfileSpecialty.map(s => ({
        Id: s.Specialties.Id,
        Name: s.Specialties.Name
    }));
    const { DoctorProfileSpecialty, ...rest } = data;
    return { ...rest, specialties };
};

exports.getAllSpecialties = async () => {
    const { data, error } = await supabase
        .from('Specialties')
        .select('*');
    if (error) throw error;
    return data;
};

exports.createDoctorProfile = async (profileData) => {
    const { data, error } = await supabase.from('DoctorProfiles').insert([profileData]).select();
    if (error) throw error;
    return data[0];
};

exports.updateDoctorProfile = async (id, profileData) => {
    const { specialties, ...profileUpdate } = profileData;

    if (Object.keys(profileUpdate).length > 0) {
        const { data, error } = await supabase
            .from('DoctorProfiles')
            .update(profileUpdate)
            .eq('Id', id)
            .select();
        if (error) throw error;
        if (!data || data.length === 0) throw new Error('Bác sĩ không tồn tại');
    } else {
        const { data, error } = await supabase
            .from('DoctorProfiles')
            .select('Id')
            .eq('Id', id)
            .single();
        if (error) throw error;
        if (!data) throw new Error('Bác sĩ không tồn tại');
    }

    if (specialties && Array.isArray(specialties)) {
        await supabase
            .from('DoctorProfileSpecialty')
            .delete()
            .eq('DoctorProfilesId', id);

        const validSpecialtiesIds = specialties.map(spec => spec.Id || spec.id).filter(id => id);
        if (validSpecialtiesIds.length > 0) {
            const { data: existingSpecialties, error: checkError } = await supabase
                .from('Specialties')
                .select('Id')
                .in('Id', validSpecialtiesIds);
            if (checkError) throw checkError;

            const existingIds = existingSpecialties.map(s => s.Id);
            const specialtyInserts = validSpecialtiesIds
                .filter(sId => existingIds.includes(sId))
                .map(specialtiesId => ({
                    DoctorProfilesId: id,
                    SpecialtiesId: specialtiesId
                }));

            if (specialtyInserts.length > 0) {
                await supabase
                    .from('DoctorProfileSpecialty')
                    .upsert(specialtyInserts, { onConflict: ['DoctorProfilesId', 'SpecialtiesId'] });
            }
        }
    }

    const updatedProfile = await exports.getDoctorProfileById(id);
    return updatedProfile;
};

exports.deleteDoctorProfile = async (id) => {
    const { data, error } = await supabase
        .from('DoctorProfiles')
        .update({
            FullName: null,
            Gender: null,
            Qualifications: null,
            YearsOfExperience: null,
            Rating: null,
            TotalReviews: null,
            Address: null,
            Email: null,
            PhoneNumber: null,
            Bio: null,
            CreatedAt: null,
            CreatedBy: null,
            LastModified: null,
            LastModifiedBy: null,
            Status: null
        })
        .eq('Id', id)
        .select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Bác sĩ không tồn tại');
    return data[0];
};