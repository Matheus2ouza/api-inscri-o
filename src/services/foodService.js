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

async function createMealTickets(ticketsData) {
  // Garante que ticketsData seja sempre tratado como array
  const ticketsArray = Array.isArray(ticketsData) ? ticketsData : [ticketsData];

  try {
    // 1. Verifica se há dados
    if (ticketsArray.length === 0) {
      throw new Error("Nenhum dado de ticket fornecido");
    }

    // 2. Validação básica da estrutura
    ticketsArray.forEach((ticket, index) => {
      if (!ticket.refeicaoId) {
        throw new Error(`Ticket na posição ${index} não tem refeicaoId`);
      }
      if (typeof ticket.refeicaoId !== 'string') {
        throw new Error(`refeicaoId no ticket ${index} deve ser uma string`);
      }
      if (ticket.active !== undefined && typeof ticket.active !== 'boolean') {
        throw new Error(`active no ticket ${index} deve ser um booleano`);
      }
    });

    // 3. Verifica existência das refeições
    const refeicaoIds = ticketsArray.map(t => t.refeicaoId);
    const existingMeals = await prisma.refeicao.findMany({
      where: { id: { in: refeicaoIds } },
      select: { id: true }
    });

    const existingIds = new Set(existingMeals.map(meal => meal.id));
    const missingIds = refeicaoIds.filter(id => !existingIds.has(id));

    if (missingIds.length > 0) {
      throw new Error(`Refeições não encontradas para os IDs: ${missingIds.join(', ')}`);
    }

    // 4. Prepara dados para criação
    const ticketsToCreate = ticketsArray.map(ticket => ({
      refeicaoId: ticket.refeicaoId,
      active: ticket.active !== undefined ? ticket.active : true,
      ...(ticket.id && { id: ticket.id }), // Usa ID se fornecido
      ...(ticket.createdAt && { createdAt: new Date(ticket.createdAt) }),
    }));

    // 5. Cria os tickets
    const createdTickets = await prisma.tickets.createMany({
      data: ticketsToCreate,
      skipDuplicates: true,
    });

    // 6. Retorna os tickets criados (com mais detalhes que apenas o count)
    if (createdTickets.count > 0) {
      const lastCreated = await prisma.tickets.findMany({
        where: { refeicaoId: { in: refeicaoIds } },
        orderBy: { createdAt: 'desc' },
        take: createdTickets.count,
        include: { refeicao: { select: { tipo: true, dia: true } } }
      });
      return lastCreated;
    }

    return [];
  } catch (error) {
    console.error("Erro no service createMealTickets:", error);
    throw error; // Re-lança o erro para ser tratado pelo controller
  }
};

module.exports = {
  updateOrCreateMeals,
  melPrices,
  createMealTickets
};
