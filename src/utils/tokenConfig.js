require('dotenv').config();
const jwt = require('jsonwebtoken');

/**
 * Gera um token JWT válido por 48h.
 * @param {object} payload - Dados para incluir no token (ex: { email: meuEmail@gmail.com }).
 * @returns {string} - Token JWT assinado.
 */
function generateToken(payload) {
    return jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: '10s' });
}


module.exports = { generateToken };
