const os = require('os');

module.exports.getData = async () => {  // Remove req, res parameters
    try {
        const osInformation = {
            platform: os.platform(),
            type: os.type(),
            hostname: os.hostname(),
            release: os.release(),
        }
        
        if (!osInformation) {
            throw new Error('OS information not available');
        }
        
        return osInformation;  // Just return the data
        
    } catch (error) {
        throw error;  // Throw error to be caught by controller
    }
}