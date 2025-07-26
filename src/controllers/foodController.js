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
    const { refeicaoId, quantity = 1 } = req.body;
    
    // 1. Buscar dados da refeição
    const meal = await mealTicketService.getMealById(refeicaoId);
    if (!meal) {
      return res.status(404).json({ success: false, message: 'Refeição não encontrada' });
    }

    // 2. Criar tickets no banco
    const ticketsData = Array.from({ length: quantity }, () => ({
      id: uuidv4(),
      refeicaoId,
      active: true,
      createdAt: new Date()
    }));

    const createdTickets = await mealTicketService.createMealTickets(ticketsData);

    // 3. Preparar dados para o PDF
    const ticketsForPDF = createdTickets.map(ticket => ({
      id: ticket.id,
      mealType: meal.tipo,
      day: meal.dia,
      value: meal.valor
    }));

    // 4. Gerar PDF com todos os tickets
    const pdfBase64 = await generateMealTicketsPDF(ticketsForPDF);

    // 5. Responder com o PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=tickets.pdf');
    res.send(Buffer.from(pdfBase64, 'base64'));

  } catch (error) {
    console.error('Erro ao criar tickets:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};