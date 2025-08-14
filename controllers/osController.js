const osservice = require('../service/osService');

module.exports.getData = async (req, res) => {
    try {
        const osInformation = await osservice.getData();  // Add await since service is async
        res.status(200).json(osInformation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}