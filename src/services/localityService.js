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
      },
      orderBy: {
        id: 'asc'
      }
    })

    return result
  }catch (err) {
    console.error("[LocalityService] Erro ao listar localidades:", err);
    throw err;
  }
}

async function activeLocality(localityId, password, status) {
  try {
    console.log(`[LocalityService] Iniciando ativação da localidade ID=${localityId}`);

    // Verifica existência da localidade
    const checkedLocality = await prisma.localidades.findUnique({
      where: { id: localityId }
    });

    if (!checkedLocality) {
      console.error(`[LocalityService] Localidade ID=${localityId} não encontrada no banco de dados`);
      throw new Error("Localidade não encontrada");
    }

    console.log(`[LocalityService] Localidade ID=${localityId} encontrada, criando hash da senha`);

    // Cria hash e salt da senha (supondo que createHash retorna { hash, salt })
    const { hash: senha_hash, salt } = createHash(password);

    console.log(`[LocalityService] Hash e salt criados, iniciando transação`);

    // Transação Prisma
    const result = await prisma.$transaction(async (prismaTx) => {
      console.log(`[LocalityService] Atualizando status da localidade para true`);

      await prismaTx.localidades.update({
        where: { id: localityId },
        data: { status: status }
      });

      console.log(`[LocalityService] Upsert na tabela autenticacao_localidades`);

      await prismaTx.autenticacao_localidades.upsert({
        where: { localidade_id: localityId },
        update: {
          senha_hash,
          salt,
          algoritmo: 'bcrypt',
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

      console.log(`[LocalityService] Transação concluída com sucesso`);

      return true;
    });

    return result;

  } catch (err) {
    console.error("[LocalityService] Erro ao ativar localidade:", err);
    throw err;
  }
}

async function deactivatedService(localityId) {
  try{
    const checkedLocality = await prisma.localidades.findUnique({
      where: {
        id: localityId
      }
    });

    if(!checkedLocality) {
      console.error(`[LocalityService] Localidade ID=${localityId} não encontrada no banco de dados`);
      throw new Error("Localidade não encontrada");
    }

    const result = await prisma.localidades.update({
      where: {id: localityId},
      data: {status: false}
    })

    console.log(`[LocalityService]A localidade ${checkedLocality.nome} teve seu status atualizado para false`)
    return result
  }catch (err) {
    console.error("[LocalityService] Erro ao ativar localidade:", err);
    throw err;
  }
}

module.exports = {
  listLocality,
  activeLocality,
  deactivatedService
};