require('dotenv').config();
const jwt = require('jsonwebtoken');

/**
 * Gera um token JWT válido por 48h.
 * @param {object} payload - Dados para incluir no token (ex: { email: meuEmail@gmail.com }).
 * @returns {string} - Token JWT assinado.
 */
function generateTokenEmail(payload) {
    return jwt.sign(payload, process.env.SECRET_KEY_EMAIL, { expiresIn: '48h' });
}

module.exports = { generateTokenEmail };
