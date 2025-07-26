const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function foodDataService(tipo, dia, valor) {
  try{
    const result = await prisma.refeicao.create({
      data: {
        tipo: tipo,
        dia: dia,
        valor: valor
      }
    })

    return result
  } catch (err) {
    throw err
  }
}

async function melPrices() {
  try{
    const result = await prisma.refeicao.findMany({
      select: {
        tipo: true,
        dia: true,
        valor: true,
        quantidadeVendida: true
      }
    })

    return result
  } catch (err) {
    throw err
  }
}

module.exports = {
  foodDataService,
  melPrices
}