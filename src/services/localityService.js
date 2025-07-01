const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

async function activeLocality(localityId) {
  try{
    const checkedLocality = await prisma.localidades.findUnique({
      where: {id: localityId}
    })

    if(!checkedLocality) {
      console.log(`[LocalityService] Localidade não encontrada no banco de dados`);
      throw new Error("Localidade não encontrada");
    }

    const result = await prisma.localidades.update({
      where: {id: localityId},
      data: {
        status: true
      }
    })
    
    return result
  } catch (err) {
    console.error("[LocalityService] Erro ao ativar localidade:", err);
    throw err;
  }
}

module.exports = {
  listLocality,
  activeLocality
};