
const express = require('express');
const { body } = require('express-validator');
const { authorizeRole} = require('../middlewares/authMiddleware')
const localityController = require('../controllers/localityController')

const router = express.Router();

router.get('/ListLocality', authorizeRole("admin"), localityController.listLocality)


module.exports = router