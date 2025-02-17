const crypto = require('crypto');

/**
 * @param {string} password
 * @return {{salt: string, hash: string}}
 */
function createHash(password) {
    const salt = crypto.randomBytes(16).toString('hex'); // Gera um salt de 16 bytes
    const iterations = 100000; // Número de iterações (seguro para 2025)
    const keylen = 64; // Tamanho do hash
    const digest = 'sha256'; // Algoritmo de hash

    // Gera o hash usando PBKDF2
    const hash = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest).toString('hex');

    return { salt, hash };
}

function verifyPassword(password, storedSalt, storedHash) {
    const iterations = 100000;
    const keylen = 64;
    const digest = 'sha256';

    const hashToCompare = crypto.pbkdf2Sync(password, storedSalt, iterations, keylen, digest).toString('hex');

    return hashToCompare === storedHash;
}

module.exports = { createHash, verifyPassword };
