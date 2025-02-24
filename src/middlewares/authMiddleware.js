const jwt = require('jsonwebtoken');

/**
 * Gera Access Token e Refresh Token para o usuário.
 * @param {object} payload - Dados que criam o token
 * @returns {object} - Objeto contendo accessToken e refreshToken
 */
function generateTokenAuth(payload) {
    const acessToken = jwt.sign(
        { id: payload.id, nome: payload.nome, role: payload.role },
        process.env.JWT_SECRET_AUTH,
        {expiresIn: "2h"}
    );

    const refreshToken = jwt.sign(
        {id: payload.id},
        process.env.JWT_SECRET_REFRESH,
        {expiresIn: "7d"}
    );

    return {acessToken, refreshToken }
}

/**
 * Middleware para autenticar o token JWT.
 * @param {Object} req 
 * @param {Object} res 
 * @param {Function} next 
 * @returns {Object} 
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1]; // Pega o token corretamente

    if (!token) {
        return res.status(401).json({ message: "Acesso negado. Token não fornecido." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_AUTH);
        req.user = decoded; // Armazena os dados decodificados
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token expirado. Faça login novamente." });
        } else if (error.name === "JsonWebTokenError") {
            return res.status(403).json({ message: "Token inválido. Acesso negado." });
        } else {
            return res.status(500).json({ message: "Erro ao validar o token." });
        }
    }
}

module.exports = { generateTokenAuth, authenticateToken }