const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createMultipleRefeicoes(dados) {
  try {
    const result = await prisma.refeicao.createMany({
      data: dados.map(d => ({
        tipo: d.tipo,
        dia: d.dia,
        valor: d.valor,
        quantidadeVendida: d.quantidadeVendida || 0
      })),
      skipDuplicates: true // impede erro se já existir mesma combinação
    });

    return result;
  } catch (err) {
    throw err;
  }
}

module.exports = {
  createMultipleRefeicoes,
  melPrices
};


module.exports = {
  foodDataService,
  melPrices
}