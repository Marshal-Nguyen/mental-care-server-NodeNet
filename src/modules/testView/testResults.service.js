const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const getStatistics = async (startDate, endDate) => {
    const endDateTime = new Date(endDate);
    endDateTime.setUTCHours(23, 59, 59, 999);
    const formattedEndDate = endDateTime.toISOString();

    const { data, error } = await supabase
        .from('TestResults')
        .select(`
      DepressionScore,
      AnxietyScore,
      StressScore,
      SeverityLevel
    `)
        .gte('TakenAt', startDate)
        .lte('TakenAt', formattedEndDate);

    if (error) throw new Error(error.message);

    const totalTests = data.length;
    const avgDepressionScore = data.reduce((sum, record) => sum + record.DepressionScore, 0) / totalTests || 0;
    const avgAnxietyScore = data.reduce((sum, record) => sum + record.AnxietyScore, 0) / totalTests || 0;
    const avgStressScore = data.reduce((sum, record) => sum + record.StressScore, 0) / totalTests || 0;
    const severityDistribution = data.reduce((acc, record) => {
        acc[record.SeverityLevel] = (acc[record.SeverityLevel] || 0) + 1;
        return acc;
    }, {});

    return {
        totalTests,
        avgDepressionScore,
        avgAnxietyScore,
        avgStressScore,
        severityDistribution,
    };
};

const getTestResults = async (startDate, endDate, pageIndex, pageSize) => {
    const endDateTime = new Date(endDate);
    endDateTime.setUTCHours(23, 59, 59, 999);
    const formattedEndDate = endDateTime.toISOString();

    const offset = (pageIndex - 1) * pageSize;
    const { data, count, error } = await supabase
        .from('TestResults')
        .select('*', { count: 'exact' })
        .gte('TakenAt', startDate)
        .lte('TakenAt', formattedEndDate)
        .order('TakenAt', { ascending: false })
        .range(offset, offset + pageSize - 1);

    if (error) throw new Error(error.message);

    const totalPages = Math.ceil(count / pageSize);

    return {
        total: count,
        pageIndex,
        pageSize,
        totalPages,
        data,
    };
};

const getTrends = async (startDate, endDate, interval) => {
    const endDateTime = new Date(endDate);
    endDateTime.setUTCHours(23, 59, 59, 999);
    const formattedEndDate = endDateTime.toISOString();

    const groupByFormat = interval === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD';
    const { data, error } = await supabase
        .from('TestResults')
        .select(`
      TakenAt,
      DepressionScore,
      AnxietyScore,
      StressScore
    `)
        .gte('TakenAt', startDate)
        .lte('TakenAt', formattedEndDate)
        .order('TakenAt', { ascending: true });

    if (error) throw new Error(error.message);

    const groupedData = data.reduce((acc, record) => {
        const date = new Date(record.TakenAt).toISOString().slice(0, interval === 'month' ? 7 : 10);
        if (!acc[date]) {
            acc[date] = {
                date,
                depressionScores: [],
                anxietyScores: [],
                stressScores: [],
            };
        }
        acc[date].depressionScores.push(record.DepressionScore);
        acc[date].anxietyScores.push(record.AnxietyScore);
        acc[date].stressScores.push(record.StressScore);
        return acc;
    }, {});

    const trends = Object.values(groupedData).map(group => ({
        date: group.date,
        avgDepressionScore: Number((group.depressionScores.reduce((sum, score) => sum + score, 0) / group.depressionScores.length || 0).toFixed(2)),
        avgAnxietyScore: Number((group.anxietyScores.reduce((sum, score) => sum + score, 0) / group.anxietyScores.length || 0).toFixed(2)),
        avgStressScore: Number((group.stressScores.reduce((sum, score) => sum + score, 0) / group.stressScores.length || 0).toFixed(2)),
    }));

    return trends.sort((a, b) => a.date.localeCompare(b.date));
};

const getSeverityByPatient = async (startDate, endDate) => {
    const endDateTime = new Date(endDate);
    endDateTime.setUTCHours(23, 59, 59, 999);
    const formattedEndDate = endDateTime.toISOString();

    const { data, error } = await supabase
        .from('TestResults')
        .select(`
      PatientId,
      SeverityLevel
    `)
        .gte('TakenAt', startDate)
        .lte('TakenAt', formattedEndDate);

    if (error) throw new Error(error.message);

    const severityByPatient = data.reduce((acc, record) => {
        const patient = acc.find(p => p.patientId === record.PatientId) || {
            patientId: record.PatientId,
            severityCounts: { Mild: 0, Moderate: 0, Severe: 0 },
        };
        patient.severityCounts[record.SeverityLevel] = (patient.severityCounts[record.SeverityLevel] || 0) + 1;
        if (!acc.find(p => p.patientId === record.PatientId)) acc.push(patient);
        return acc;
    }, []);

    // Thêm trường total cho mỗi patient
    return severityByPatient.map(patient => ({
        ...patient,
        total: patient.severityCounts.Mild + patient.severityCounts.Moderate + patient.severityCounts.Severe,
    }));
};

const getPatientTestDetails = async (patientId, startDate, endDate) => {
    const endDateTime = new Date(endDate);
    endDateTime.setUTCHours(23, 59, 59, 999);
    const formattedEndDate = endDateTime.toISOString();

    const { data, error } = await supabase
        .from('TestResults')
        .select('*')
        .eq('PatientId', patientId)
        .gte('TakenAt', startDate)
        .lte('TakenAt', formattedEndDate)
        .order('TakenAt', { ascending: false });

    if (error) throw new Error(error.message);

    return data;
};

module.exports = {
    getStatistics,
    getTestResults,
    getTrends,
    getSeverityByPatient,
    getPatientTestDetails,
};