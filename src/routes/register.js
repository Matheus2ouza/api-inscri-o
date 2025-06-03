const express = require("express");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const xlsx = require("xlsx");
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require("../middlewares/authMiddleware");
const prisma = new PrismaClient();
const { v4: uuidv4 } = require("uuid");
const { redis } = require("../lib/redis");

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

      const user = req.user;
      console.log(user);

      const eventSelectedId = req.body.eventSelectedId;
      console.log(eventSelectedId);

      const responsible = req.body.responsible;
      console.log(responsible);

      if (!eventSelectedId || !responsible) {
        return res.status(400).json({ message: "Required fields are missing or invalid." })
      };

      // Lê o arquivo Excel a partir da memória
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });

      // Seleciona a primeira planilha do arquivo
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Converte os dados da planilha para JSON
      const jsonData = xlsx.utils.sheet_to_json(worksheet, {
        range: 2, // Começa a ler a partir da terceira linha (índice 2)
        defval: null, // Define valor padrão para células vazias,
        
      }).slice(1); //Ignora a 4 linha (índice 3)

      // Funções auxiliares de log
      function logError(message) {
        console.error(`[ERRO] ${message}:`);
      }

      function logWarn(message) {
        console.warn(`[AVISO] ${message}:`);
      }

      console.log(eventSelectedId);
      console.log(typeof eventSelectedId);

      const inscriptionType = await prisma.tipo_inscricao.findMany({
        where: {
          evento_id: Number(eventSelectedId),
        },
        select:{
          id:true,
          descricao: true,
          valor:true
        },
      });

      console.log(inscriptionType);

      // Cria um Set com os tipos de inscrição válidos
      const validInscriptionTypes = new Set(
        inscriptionType.map(item => item.descricao.trim().toUpperCase())
      );

      const typeToValueMap = {};
      inscriptionType.forEach(item => {
        typeToValueMap[item.descricao.trim().toUpperCase()] = Number(item.valor);
      });

      console.log(validInscriptionTypes)
      console.log(typeToValueMap);

      const errors = {};

      // Arrays para armazenar erros
      const missingData = []; //array para armazenar linhas com dados ausentes
      const invalidNames = []; //array para armazenar nomes inválidos
      const invalidBirthDates = []; //array para armazenar datas de nascimento inválidas
      const invalidRegistrationTypes = []; //array para armazenar tipos de inscrição inválidos
      
      const seenNames = new Set(); // Set para rastrear nomes já vistos

      jsonData.forEach((item, index) => {
        const fullName = item["Nome Completo"]?.trim();
        const birthDateRaw = item["Data de nascimento"];
        const gender  = item["Sexo"]?.trim();
        const registrationType  = item["Tipo de Inscrição"]?.trim().toUpperCase();

        // Verifica se tem alguma célula vazia
        const missingFields = [];

        if (!fullName) missingFields.push("Nome Completo");
        if (!birthDateRaw) missingFields.push("Data de nascimento");
        if (!gender) missingFields.push("Sexo");
        if (!registrationType ) missingFields.push("Tipo de Inscrição");

        // Caso encontre algum campo obrigatório vazio, adiciona ao array de erros
        if (!fullName || !birthDateRaw || !gender || !registrationType) {
          logWarn(`Linha ${index + 5}, Campos obrigatórios ausentes: ${missingFields.join(", ")}`);
          missingData.push({
            row: index + 5,
            field: missingFields
          });
        }

        // Regex para verificar se o nome está no formato correto
        const nameRegex = /^[A-Za-zÀ-ÿ]+(?: [A-Za-zÀ-ÿ]+)+$/;

        const isValidName = nameRegex.test(fullName) // Verifica se o nome está no formato correto
        const isDuplicated = seenNames.has(fullName); // Verifica se o nome já foi visto

        if (!isValidName || isDuplicated) {
          logWarn(`Linha ${index + 5}, Nome inválido ou duplicado: ${fullName}`);
          invalidNames.push({
            row: index + 5,
            name: fullName
          });
        }
        seenNames.add(fullName);

        const age = calculateAge(birthDateRaw);
        const birthDate = excelSerialDateToJSDate(birthDateRaw);

        // Verifica se a data de nascimento é válida
        if(age === null || age < 0 || age > 120) {
          logWarn(`Linha ${index + 5}, Data de nascimento inválida: ${birthDateRaw}`);
          invalidBirthDates.push({
            row: index + 5,
            field: birthDate.toLocaleDateString('pt-BR', {year: 'numeric', month: '2-digit', day: '2-digit'})
          });
        }

        // Verifica se o tipo de inscrição é válido
        if (registrationType && !validInscriptionTypes.has(registrationType)) {
          logWarn(`Linha ${index + 5}, Tipo de Inscrição inválido: ${registrationType}`);
          invalidRegistrationTypes.push({
            row: index + 5,
            field: registrationType
          });
        };
      });

      if(invalidRegistrationTypes.length > 0) {
        errors.invalidRegistrationTypes = invalidRegistrationTypes;
      }

      if (missingData.length > 0) {
        errors.missingData = missingData;
      }

      if(invalidNames.length > 0) {
        errors.invalidNames = invalidNames;
      }

      if (invalidBirthDates.length > 0) {
        errors.invalidBirthDates = invalidBirthDates;
      }

      const hasErrors = Object.keys(errors).length > 0;

      if (!hasErrors) {
        const participants = {};

        jsonData.forEach(item =>{
          const fullname = item["Nome Completo"]?.trim();
          const birthDateRaw = item["Data de nascimento"];
          const gender = item["Sexo"]?.trim();
          const registrationType = item["Tipo de Inscrição"]?.trim().toUpperCase();
          
          const age = calculateAge(birthDateRaw);
          const birthDate = excelSerialDateToJSDate(birthDateRaw);
          
          participants[fullname] = {
            birthDate: birthDate.toLocaleDateString('pt-BR', {year: 'numeric', month: '2-digit', day: '2-digit'}),
            age: age,
            gender: gender,
            registrationType: registrationType,
          }

          return participants;
        });

        const validatedData	= {
          userid: user.id,
          eventId: eventSelectedId,
          responsible: responsible,
          participants: participants
        }

        const key = `inscription:${eventSelectedId}:${user.id}:${new Date().toISOString().split('T')[0]}`;
        const value = JSON.stringify({
          eventId: Number(eventSelectedId),
          responsible: responsible,
          timestamp: new Date().toISOString(),
          participants: participants
        });

        const redisResult = await redis.set(key, value, 'EX', 60 * 60) // Expira em 1 hora

        if (redisResult === 'OK') {
          console.log("Dados salvos no Redis com sucesso.");
        } else {
          console.error("Erro ao salvar dados no Redis:", redisResult);
        }

        return res.status(200).json({
          message: "O arquivo foi processado com sucesso.",
          data: validatedData
        });
      }

      if (hasErrors) {
        return res.status(200).json({
          message: "O arquivo foi processado, mas foram encontrados erros nos dados.",
          errors: errors
        });
      }

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
