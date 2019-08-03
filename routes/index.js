const
    express = require('express'),
    router = express.Router(),
    fs = require('fs-extra')

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', (err, html) => {
        res.send(html)
        fs.writeFile('index.html', html)
    })
})

module.exports = router