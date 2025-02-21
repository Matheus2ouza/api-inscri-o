require('dotenv').config();
const jwt = require('jsonwebtoken');

/**
 * Gera um token JWT válido por 48h.
 * @param {object} payload - Dados para incluir no token (ex: { userId: 123 }).
 * @returns {string} - Token JWT assinado.
 */
function generateToken(payload) {
    return jwt.sign(payload, SECRET_KEY, { expiresIn: '48h' });
}


module.exports = { generateToken };
