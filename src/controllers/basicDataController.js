const { validationResult } = require('express-validator');
const basicDataService = require('../services/basicDataService')

exports.events = async (req, res) => {
  try {
    const result = await basicDataService.eventService();

    return res.status(200).json(result);
  } catch (error) {
    console.error("Erro ao buscar eventos:", error);
    return res.status(500).json({ message: "Erro ao buscar eventos" });
  }
};