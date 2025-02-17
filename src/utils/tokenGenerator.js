const crypto = require('crypto');

/**
 * @param {number} size
 * @returns {string} 
 */

function generateToken(size = 32) {
    return crypto.randomBytes(size).toString('hex');
};

module.exports = { generateToken };