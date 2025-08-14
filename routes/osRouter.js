var express = require('express');
var router = express.Router();
//const os=require('os')
const osController = require ('../controllers/osController');
/* GET home page. */
router.get('/getosInfomation', osController.getData)
/*     try {
        const osInformation = {
            platform: os.platform(),
            type : os.type(),
            hostname: os.hostname(),
            release: os.release(),
        }
        console.log(osInformation);
        res.status(200).json(osInformation);
    } catch (error) {
        res.status(500).json({ message : error.message   });
    }
}); */

module.exports = router;
