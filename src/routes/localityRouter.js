
const express = require('express');
const { body } = require('express-validator');
const { authorizeRole, authenticateToken} = require('../middlewares/authMiddleware')
const localityController = require('../controllers/localityController')

const router = express.Router();

router.get('/ListLocality',authenticateToken, authorizeRole("admin"), localityController.listLocality)


module.exports = router