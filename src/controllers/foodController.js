const { validationResult } = require("express-validator");
const foodService = require('../services/foodService')
const { generateMealTicketsPDF } = require('../utils/generateMealTicketsPDF')

exports.updateMealPrices = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Dados inválidos",
      errors: errors.array()
    });
  }

  try {
    const { meals } = req.body;
    const result = await foodService.updateOrCreateMeals(meals);

    return res.status(200).json({
      success: true,
      message: 'Preços atualizados com sucesso!',
      data: result
    });
  } catch (error) {
    console.error('[updateMealPrices]', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar preços'
    });
  }
};

exports.melPrices = async (req, res) => {
  try{
    const prices = await foodService.melPrices()

    if(!prices) {
      return res.status(404).json({
        success: false,
        message: 'Nenhum dados de alimentação'
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Dados de alimentação encontrados',
      data: prices
    })
  } catch (error) {
    console.log(`[FoodController] Erro ao tentar buscar os valores: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    })
  }
}

exports.createMealTickets = async (req, res) => {
  try {
    const { tickets } = req.body;

    // 1. Criar tickets no banco de dados
    const createdTickets = await prisma.tickets.createMany({
      data: tickets.map(ticket => ({
        refeicaoId: ticket.refeicaoId,
        active: true,
        paymentMethod: ticket.paymentMethod
      })),
      skipDuplicates: true,
    });

    // 2. Buscar os tickets criados com informações da refeição
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
      take: createdTickets.count
    });

    // 3. Gerar PDF com todos os tickets
    const pdfBase64 = await generateMealTicketsPDF(
      ticketsWithMeal.map(ticket => ({
        id: ticket.id,
        mealType: ticket.refeicao.tipo,
        day: ticket.refeicao.dia,
        value: ticket.refeicao.valor,
        paymentMethod: ticket.paymentMethod
      }))
    );

    // 4. Responder com sucesso
    res.status(201).json({
      success: true,
      message: 'Tickets criados com sucesso',
      tickets: ticketsWithMeal,
      pdfBase64
    });

  } catch (error) {
    console.error('Erro ao criar tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar tickets'
    });
  } finally {
    await prisma.$disconnect();
  }
};