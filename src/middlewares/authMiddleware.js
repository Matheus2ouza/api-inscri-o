const jwt = require('jsonwebtoken');

/**
 * Gera Access Token e Refresh Token para o usuário.
 * @param {object} payload - Dados que criam o token
 * @returns {object} - Objeto contendo accessToken e refreshToken
 */
function generateTokenAuth(payload) {
    console.log(payload.id, payload.nome, payload.role);

    const accessToken = jwt.sign(
        { id: payload.id, nome: payload.nome, role: payload.role },
        process.env.JWT_SECRET_AUTH,
        { expiresIn: "2h" }
    );

    const refreshToken = jwt.sign(
        { id: payload.id },
        process.env.JWT_SECRET_REFRESH,
        { expiresIn: "7h" }
    );

    console.log("Access Token Gerado:", accessToken);
    console.log("Refresh Token Gerado:", refreshToken);

    return { accessToken, refreshToken };
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

    console.log("Verificando autenticação...");
    console.log("Token extraído:", token);

    if (!token) {
        console.warn("Acesso negado: Token não fornecido.");
        return res.status(401).json({ message: "Acesso negado. Token não fornecido." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_AUTH);
        console.log("Token decodificado com sucesso:", decoded);
        console.log("Expira em:", new Date(decoded.exp * 1000), " | Agora:", new Date());

        req.user = decoded; // Armazena os dados decodificados

        next();
    } catch (error) {
        console.error("Erro ao validar o token:", error);

        if (error.name === "TokenExpiredError") {
            console.warn("Token expirado.");
            return res.status(401).json({ message: "Token expirado. Faça login novamente." });
        } else if (error.name === "JsonWebTokenError") {
            console.warn("Token inválido.");
            return res.status(401).json({ message: "Token inválido. Acesso negado." });
        } else {
            console.error("Erro interno na validação do token.");
            return res.status(500).json({ message: "Erro ao validar o token." });
        }
    }
}

/**
 * Middleware para autorizar usuários com base no papel (role).
 * @param {string} rolePermitido
 */
function authorizeRole(rolePermitido) {
    return (req, res, next) => {
        console.log("🔐 Verificando permissão de acesso...");
        console.log("🔑 Role exigido:", rolePermitido);

        console.log(req.user)

        if (!req.user) {
            console.warn("❌ Nenhum usuário autenticado encontrado no request.");
            return res.status(401).json({ message: "Usuário não autenticado." });
        }

        console.log("👤 Usuário autenticado:", {
            id: req.user.id,
            nome: req.user.nome,
            role: req.user.role
        });

        if (req.user.role === rolePermitido) {
            console.log("✅ Permissão concedida.");
            next();
        } else {
            console.warn(`🚫 Acesso negado. Role '${req.user.role}' não é '${rolePermitido}'.`);
            return res.status(403).json({ message: "Acesso negado. Permissão insuficiente." });
        }
    };
}


module.exports = { generateTokenAuth, authenticateToken, authorizeRole }