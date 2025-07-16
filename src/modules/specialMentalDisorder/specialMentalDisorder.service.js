const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

class SpecificMentalDisordersService {
    async getAllSpecificMentalDisorders() {
        try {
            const { data, error } = await supabase
                .from('SpecificMentalDisorders')
                .select('*');

            if (error) {
                throw new Error(`Error fetching data: ${error.message}`);
            }

            return data;
        } catch (error) {
            throw new Error(`Service error: ${error.message}`);
        }
    }
}

module.exports = new SpecificMentalDisordersService();