const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { createHash } = require('../utils/hashConfig')

async function listLocality() {
  try {
    const result = await prisma.localidades.findMany({
      where: {role: "user"},
      select: {
        id: true,
        nome: true,
        saldo_devedor: true,
        status: true
      }
    })

    return result
  }catch (err) {
    console.error("[LocalityService] Erro ao listar localidades:", err);
    throw err;
  }
}

async function activeLocality(localityId, password) {
  try {
    // Verifica existência da localidade
    const checkedLocality = await prisma.localidades.findUnique({
      where: { id: localityId }
    });

    if (!checkedLocality) {
      console.log(`[LocalityService] Localidade não encontrada no banco de dados`);
      throw new Error("Localidade não encontrada");
    }

    // Cria hash e salt da senha (supondo que createHash retorna { hash, salt })
    const { hash: senha_hash, salt } = createHash(password);

    // Transação Prisma
    const result = await prisma.$transaction(async (prismaTx) => {
      // Atualiza status para true
      await prismaTx.localidades.update({
        where: { id: localityId },
        data: { status: true }
      });

      // Atualiza ou cria o registro na tabela autenticacao_localidades
      // Usando upsert: cria se não existir, atualiza se existir
      await prismaTx.autenticacao_localidades.upsert({
        where: { localidade_id: localityId },
        update: {
          senha_hash,
          salt,
          algoritmo: 'bcrypt', // ou o que você usa
          data_atualizacao: new Date()
        },
        create: {
          localidade_id: localityId,
          senha_hash,
          salt,
          algoritmo: 'bcrypt',
          data_atualizacao: new Date()
        }
      });

      // Retorna algo opcional ou vazio
      return true;
    });

    return result;

  } catch (err) {
    console.error("[LocalityService] Erro ao ativar localidade:", err);
    throw err;
  }
}


module.exports = {
  listLocality,
  activeLocality
};