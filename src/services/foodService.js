const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Atualiza ou cria refeições
async function updateOrCreateMeals(meals) {
  try {
    const transactions = meals.map(meal =>
      prisma.refeicao.upsert({
        where: {
          refeicao_tipo_dia: {
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
  try {
    const result = await prisma.refeicao.findMany({
      select: {
        id: true,
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

async function createTicketsWithMealData(tickets) {
  try {
    // 1. Criar os tickets
    const created = await prisma.tickets.createMany({
      data: tickets.map(ticket => ({
        refeicaoId: ticket.refeicaoId,
        active: true,
        paymentMethod: ticket.paymentMethod
      })),
      skipDuplicates: true,
    });

    // 2. Buscar os tickets com dados da refeição
    const ticketsWithMeal = await prisma.tickets.findMany({
      where: { 
        refeicaoId: { in: tickets.map(t => t.refeicaoId) }
      },
      include: {
        refeicao: {
          select: {
            tipo: true,
            dia: true,
            valor: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: created.count
    });

    return ticketsWithMeal;
  } catch (error) {
    console.error('Erro no ticketService:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};

module.exports = {
  updateOrCreateMeals,
  melPrices,
  createTicketsWithMealData
};
