const express = require("express");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const xlsx = require("xlsx");
const { PrismaClient } = require('@prisma/client');
const { list } = require("pdfkit");
const prisma = new PrismaClient();

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
  uploadLimiter,
  upload.single("file"),  // "file" deve ser o mesmo nome usado no frontend
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado." });
      }

      console.log("Arquivo recebido:", req.file); // Verifica os detalhes do arquivo

      // Lê o arquivo Excel a partir da memória
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });

      // Seleciona a primeira planilha do arquivo
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Converte os dados da planilha para JSON
      const jsonData = xlsx.utils.sheet_to_json(worksheet);

      // Loop para transformar o jsonData em um objeto com índice 0 e os dados necessários
      const inscriptionData = jsonData.map((row) => {
        const name = row["Nome completo"];
        const birthDate = row["Data de nascimento"];
        const sex = row["Sexo"];
        const inscriptionType = row["Tipo de Inscrição"];

        // Calcula a idade com base na data de nascimento
        const age = calculateAge(birthDate);

        // Cria o objeto para cada pessoa com nome, idade, sexo e tipo de inscrição
        return {
          name: name,
          sex: sex,
          inscriptionType: inscriptionType,
          age: age
        };
      });

      // const inscriptionCount = {
      //   normal: 0,
      //   meia: 0,
      //   participação: 0,
      //   serviço: 0,
      //   isenta: 0
      // };
      
      // const totais = {
      //   totalNormal: 0,
      //   totalMeia: 0,
      //   totalParticipação: 0,
      //   totalServiço: 0
      // };
      
      // const event = await prisma.eventos.findFirst({
      //   where: { status: true },
      //   select: { id: true }
      // });
      
      // const valueInscription = await prisma.tipo_inscricao.findMany({
      //   where: { evento_id: event.id },
      // });
      
      // console.log(valueInscription);
      
      // // Mapeamento de tipos de inscrição para os contadores
      // const tipoInscricaoMap = {
      //   'NORMAL': { count: 'normal', total: 'totalNormal' },
      //   'MEIA': { count: 'meia', total: 'totalMeia' },
      //   'PARTICIPAÇÃO': { count: 'participação', total: 'totalParticipação' },
      //   'SERVIÇO': { count: 'serviço', total: 'totalServiço' }
      // };
      
      // // Função para processar cada pessoa
      // function processPerson(person) {
      //   if (person.age < 6) {
      //     // Se a pessoa for menor que 6 anos, é isenta
      //     inscriptionCount.isenta++;
      //     return;
      //   }
      
      //   // Se a pessoa tem 6 anos ou mais, vamos verificar o tipo de inscrição
      //   processInscricaoType(person);
      // }
      
      // // Função para processar o tipo de inscrição
      // function processInscricaoType(person) {
      //   const tipoInscricao = valueInscription.find(inscricao => inscricao.tipo_inscricao === person.tipo_inscricao);
      
      //   if (!tipoInscricao) {
      //     console.log(`Tipo de inscrição não encontrado para ${person.name}`);
      //     return;
      //   }
      
      //   // Incrementa os contadores de inscrição e totais
      //   const tipo = person.tipo_inscricao.toUpperCase();
      //   if (tipoInscricaoMap[tipo]) {
      //     inscriptionCount[tipoInscricaoMap[tipo].count]++;
      //     totais[tipoInscricaoMap[tipo].total]++;
      //   } else {
      //     console.log(`Tipo de inscrição desconhecido para ${person.name}`);
      //   }
      // }
      
      // // Processando todas as pessoas
      // inscriptionData.forEach(processPerson);
      
      // Retornar os resultados com os dados de inscrição e total
      return res.status(200).json({
        status: "success",
        message: "Arquivo convertido para JSON com sucesso",
        inscription: inscriptionData,
        data:jsonData
      });


    } catch (error) {
      console.log("Erro interno no servidor", error);
      return res.status(500).json({ message: "Erro interno no servidor" });
    }
  }
);

module.exports = registerRoutes;
