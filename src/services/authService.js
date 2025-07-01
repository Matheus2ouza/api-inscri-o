const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { verifyPassword } = require('../utils/hashConfig');
const { generateTokenAuth } = require('../middlewares/authMiddleware')

async function loginService(locality, password) {

  const verifyLocality = await prisma.localidades.findFirst({
    where: {
      nome: locality
    },
    select: {
      id: true,
      nome: true,
      role: true,
      status: true,
    }
  })

  if (!verifyLocality) {
    console.log(`[authService] Tentativa de login com a localidade ${locality}. Lolicadade não existe`)
    throw new Error("Localidade não encontrada, entre em contato com o suporte");
  }

  if (!verifyLocality.status) {
    console.log(`[authService] Tentativa de login com a localidade ${locality}. Lolicadade está inativa`)
    throw new Error("Essa localidade esta inativa, entre em contato com o suporte");
  }

  // Verifica se há autenticação vinculada
  const verificationPassword = await prisma.autenticacao_localidades.findFirst({
    where: { localidade_id: verifyLocality.id }
  });

  if (!verificationPassword) {
    console.log(`[authService] Tentativa de login com a localidade ${locality}. Localidade não tem uma autenticação`)
    throw new Error("Essa localidade tem uma auntenticação, entre em contato com o suporte");
  }
  const matchPassword = await verifyPassword(password, verificationPassword.salt, verificationPassword.senha_hash)

  if (!matchPassword) {
    console.log(`[authService] Tentativa de login com a localidade ${locality}. A senha não que foi passada esta incorreta`)
    throw new Error("Senha incorreta, tente novamente");
  }

  const { accessToken } = generateTokenAuth({
    id: verifyLocality.id,
    nome: verifyLocality.nome,
    role: verifyLocality.role
  })

  return accessToken
}

module.exports = {
  loginService,
}