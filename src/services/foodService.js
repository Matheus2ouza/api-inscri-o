const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Atualiza ou cria refeições
async function updateOrCreateMeals(meals) {
  try {
    const transactions = meals.map(meal => 
      prisma.refeicao.upsert({
        where: {
          tipo_dia: {
            tipo: meal.tipo,
            dia: meal.dia
          }
        },
        update: {
          valor: meal.valor,
          quantidadeVendida: meal.quantidadeVendida || 0
        },
        create: {
          tipo: meal.tipo,
          dia: meal.dia,
          valor: meal.valor,
          quantidadeVendida: meal.quantidadeVendida || 0
        }
      })
    );

    return await prisma.$transaction(transactions);
  } catch (err) {
    throw err;
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
  updateOrCreateMeals,
  melPrices
};
