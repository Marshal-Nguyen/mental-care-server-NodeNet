const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.getAllDoctorProfiles = async (pageIndex = 1, pageSize = 10, specialtiesId = null) => {
    const start = (pageIndex - 1) * pageSize;
    const end = start + pageSize - 1;

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
        .range(start, end);

    // Add filter for specialtiesId if provided

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
    const { data, error } = await supabase.from('DoctorProfiles').insert([profileData]);
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
        // Xóa các mối quan hệ cũ
        await supabase
            .from('DoctorProfileSpecialty')
            .delete()
            .eq('DoctorProfileId', id);

        // Lấy danh sách SpecialtiesId từ payload
        const validSpecialtiesIds = specialties.map(spec => spec.Id || spec.id).filter(id => id);
        if (validSpecialtiesIds.length > 0) {
            // Kiểm tra xem các SpecialtiesId có tồn tại
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
            if (specialties !== undefined) {
                // Luôn xóa toàn bộ chuyên môn cũ trước
                await supabase
                    .from('DoctorProfileSpecialty')
                    .delete()
                    .eq('DoctorProfilesId', id);

                // Nếu mảng specialties có phần tử thì tiếp tục insert lại
                if (Array.isArray(specialties) && specialties.length > 0) {
                    // Lấy danh sách SpecialtiesId hợp lệ
                    const validSpecialtiesIds = specialties.map(spec => spec.Id || spec.id).filter(id => id);

                    if (validSpecialtiesIds.length > 0) {
                        // Kiểm tra xem các SpecialtiesId có tồn tại
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
            }

        }
    }

    // Lấy lại dữ liệu sau khi cập nhật
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