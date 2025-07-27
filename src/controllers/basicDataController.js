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

exports.list = async (req, res) => {
  try {
    const list = await basicDataService.listService();

    if (!list || Object.keys(list).length === 0) {
      console.error(`[basicDataService] Nenhuma lista encontrada`);
      return res.status(404).json({
        success: false,
        message: 'Nenhuma lista encontrada'
      });
    }

    // Calcula a quantidade total de participantes
    let qtdParticipant = 0;
    let valueTotal = 0;
    let qtdMasc = 0;
    let qtdFem = 0;

    for (const localidade in list) {
      qtdParticipant += list[localidade].total;
      valueTotal += list[localidade].total * 120;
    }

    for (const localidade in list) {
      qtdMasc += list[localidade].masculino;
      qtdFem += list[localidade].feminino;
    }
    
    return res.status(200).json({
      success: true,
      list: list,
      qtd_participant: qtdParticipant
    });

  } catch (error) {
    console.error(`[basicDataService] Erro ao tentar buscar a lista: ${error.message}`);

    return res.status(500).json({
      success: false,
      message: "Erro ao tentar buscar a lista de inscritos"
    });
  }
};
