const { validationResult } = require("express-validator");
const foodService = require('../services/foodService')
const { generateMealTicketsPDF } = require('../utils/generateMealTicketsPDF');

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

    // 1. Criar tickets e buscar os dados necessários no service
    const ticketsWithMeal = await foodService.createTicketsWithMealData(tickets);

    // 2. Gerar PDF
    const pdfBase64 = await generateMealTicketsPDF(
      ticketsWithMeal.map(ticket => ({
        id: ticket.id,
        mealType: ticket.refeicao.tipo,
        day: ticket.refeicao.dia,
        value: ticket.refeicao.valor,
        paymentMethod: ticket.paymentMethod
      }))
    );

    // 3. Resposta de sucesso
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
  }
};


exports.verifyTicket = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Dados inválidos",
    });
  }

  const id  = req.param;

  try {
    const result = await foodService.verifyTicketService(id);
    return res.status(200).json({
      success: true,
      message: "Ticket verificado com sucesso.",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Erro ao verificar o ticket."
    });
  }
};