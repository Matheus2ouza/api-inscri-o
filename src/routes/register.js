const express = require("express");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const xlsx = require("xlsx");
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require("../middlewares/authMiddleware");
const prisma = new PrismaClient();
const { v4: uuidv4 } = require("uuid");
const { redis } = require("../lib/redis")

const registerRoutes = express.Router();

// Configuração do multer para armazenar o arquivo na memória
const storage = multer.memoryStorage();

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { message: "Muitas tentativas de envio. Tente novamente mais tarde" }
});

function excelSerialDateToJSDate(serial) {
  const excelEpoch = new Date(1899, 11, 30); // Excel começa em 30/12/1899
  return new Date(excelEpoch.getTime() + serial * 86400000); // Multiplica pelos ms de um dia
}

// Função para calcular a idade
function calculateAge(birthDate) {
  // Se for número, converte do formato Excel
  if (typeof birthDate === "number") {
    birthDate = excelSerialDateToJSDate(birthDate);
  } else {
    console.error(`Invalid birthDate type: ${typeof birthDate}`);
    return null;
  }

  if (!(birthDate instanceof Date) || isNaN(birthDate)) {
    console.error(`Invalid birthDate:`, birthDate);
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const currentMonth = today.getMonth();
  const birthMonth = birthDate.getMonth();

  // Ajuste para não contar o aniversário antes da data atual
  if (currentMonth < birthMonth || (currentMonth === birthMonth && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } });

registerRoutes.post(
  "/upload-file",
  authenticateToken,
  uploadLimiter,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado." });
      }

      const user = req.user
      console.log(user);

      const eventSelected = req.body.event;
      console.log(event);

      const responsible = req.body.responsible;
      console.log(responsible);

      // Lê o arquivo Excel a partir da memória
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });

      // Seleciona a primeira planilha do arquivo
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Converte os dados da planilha para JSON
      const jsonData = xlsx.utils.sheet_to_json(worksheet);

    // Funções auxiliares de log
    function logError(context, error) {
      console.error(`[ERRO] ${context}:`, error);
    }

    function logWarn(context, warning) {
      console.warn(`[AVISO] ${context}:`, warning);
    }

    // Transforma o Excel em JSON
    const inscriptionData = jsonData.map((row) => {
      const name = row["Nome completo"];
      const birthDate = row["Data de nascimento"];
      const sex = row["Sexo"];
      const inscriptionType = row["Tipo de Inscrição"];

      const age = calculateAge(birthDate);

      return {
        name: name,
        sex: sex,
        inscriptionType: inscriptionType,
        age: age
      };
    });

    const inscriptionCount = {
      normal: 0,
      meia: 0,
      participação: 0,
      serviço: 0,
      isenta: 0
    };

    const totais = {
      totalNormal: 0,
      totalMeia: 0,
      totalParticipação: 0,
      totalServiço: 0
    };

    const event = await prisma.eventos.findFirst({
      where: { status: true },
      select: { id: true }
    });

    const valueInscription = await prisma.tipo_inscricao.findMany({
      where: { evento_id: event.id },
    });

    const tipoInscricaoMap = {
      'NORMAL': { count: 'normal', total: 'totalNormal' },
      'MEIA': { count: 'meia', total: 'totalMeia' },
      'PARTICIPAÇÃO': { count: 'participação', total: 'totalParticipação' },
      'SERVIÇO': { count: 'serviço', total: 'totalServiço' }
    };

    // Processa cada pessoa
    function processPerson(person) {
      if (person.age < 6) {
        inscriptionCount.isenta++;
        return;
      }

      processInscricaoType(person);
    }

    // Processa o tipo de inscrição
    function processInscricaoType(person) {
      const tipoInscricao = valueInscription.find(inscricao => 
        inscricao.descricao.trim().toUpperCase() === person.inscriptionType.trim().toUpperCase()
      );

      if (!tipoInscricao) {
        logWarn("Tipo de inscrição não encontrado", `${person.name} - "${person.inscriptionType}"`);
        return;
      }

      const tipo = person.inscriptionType.trim().toUpperCase();
      const valorInscricao = Number(tipoInscricao.valor);

      if (isNaN(valorInscricao)) {
        logError("Valor inválido", `${person.name} - Valor: ${tipoInscricao.valor}`);
        return;
      }

      if (tipoInscricaoMap[tipo]) {
        inscriptionCount[tipoInscricaoMap[tipo].count]++;
        totais[tipoInscricaoMap[tipo].total] += valorInscricao;
      } else {
        logWarn("Tipo de inscrição desconhecido", person.name);
      }
    }

    // Processa todo mundo
    inscriptionData.forEach(processPerson);

    // Retorna a resposta
    return res.status(200).json({
      status: "success",
      message: "Arquivo convertido para JSON com sucesso",
      inscription: inscriptionData,
      inscriptionCount: inscriptionCount,
      totais: totais
    });
      

    } catch (error) {
      console.log("Erro interno no servidor", error);
      return res.status(500).json({ message: "Erro interno no servidor" });
    }
  }
);

registerRoutes.post(
  "/confirm-register",
  authenticateToken,
  uploadLimiter,
  async (req, res) =>{

  }
);

module.exports = registerRoutes;
