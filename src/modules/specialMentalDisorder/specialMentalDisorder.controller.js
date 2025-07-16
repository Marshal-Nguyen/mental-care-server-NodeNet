const SpecificMentalDisordersService = require('./specialMentalDisorder.service');

class SpecificMentalDisordersController {
    async getAllSpecificMentalDisorders(req, res) {
        try {
            const data = await SpecificMentalDisordersService.getAllSpecificMentalDisorders();
            res.status(200).json({
                success: true,
                data,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    }
}

module.exports = new SpecificMentalDisordersController();