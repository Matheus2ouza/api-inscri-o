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
    console.error("Erro ao listar localidades:", err);
    throw err;
  }
}

module.exports = {
  listLocality
};