const testResultsService = require('./testResults.service');

const getStatistics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }
        const statistics = await testResultsService.getStatistics(startDate, endDate);
        res.status(200).json(statistics);
    } catch (error) {
        console.error('Error in getStatistics:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getTestResults = async (req, res) => {
    try {
        const { startDate, endDate, pageIndex = 1, pageSize = 10 } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }
        const results = await testResultsService.getTestResults(startDate, endDate, parseInt(pageIndex), parseInt(pageSize));
        res.status(200).json(results);
    } catch (error) {
        console.error('Error in getTestResults:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getTrends = async (req, res) => {
    try {
        const { startDate, endDate, interval = 'day' } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }
        const trends = await testResultsService.getTrends(startDate, endDate, interval);
        res.status(200).json({ trends });
    } catch (error) {
        console.error('Error in getTrends:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getSeverityByPatient = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }
        const severityData = await testResultsService.getSeverityByPatient(startDate, endDate);
        res.status(200).json({ patients: severityData });
    } catch (error) {
        console.error('Error in getSeverityByPatient:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getPatientTestDetails = async (req, res) => {
    try {
        const { patientId } = req.params;
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }
        const results = await testResultsService.getPatientTestDetails(patientId, startDate, endDate);
        res.status(200).json({ patientId, results });
    } catch (error) {
        console.error('Error in getPatientTestDetails:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getStatistics,
    getTestResults,
    getTrends,
    getSeverityByPatient,
    getPatientTestDetails,
};