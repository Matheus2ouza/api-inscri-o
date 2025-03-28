const express = require("express");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const xlsx = require("xlsx");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const registerRoutes = express.Router();

// Configuração do multer para armazenar o arquivo na memória
const storage = multer.memoryStorage();

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { message: "Muitas tentativas de envio. Tente novamente mais tarde" }
});

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

      const inscriptionData = {};

      // Loop através dos dados para extrair os nomes
      jsonData.forEach(row => {
        const name = row["Nome completo"];  // Acessa a coluna que contém o nome
        const age = row["Idade"];

        if (name) {
          inscriptionData[name] = {
            name: name,
            age: age
          }
        }
      });

      // Inicializa contadores para cada tipo de inscrição
      const inscriptionCount = {
        normal: 0,
        participação: 0,
        serviço: 0,
        meia: 0,  // Contagem de "meia" para inscrições com valor 120
        isenta: 0, // Contagem de "isenta" para inscrições com valor 0
      };

      let eventRegistrationFees = {};

      // Loop através dos dados de inscrição para contar e calcular o valor por tipo de inscrição
      jsonData.forEach(row => {
        const type = row["Tipo de Inscrição"];
        const birthDate = row["Data de Nascimento"];

        if (type && birthDate) {
          const lowerCaseType = type.toLowerCase().trim();

          // Calcular a idade a partir da data de nascimento
          const birthDateObj = new Date(birthDate);
          const age = new Date().getFullYear() - birthDateObj.getFullYear();

          let typeToRecord = lowerCaseType;
          let value = 0; // O valor será ajustado de acordo com a idade e tipo

          // Definir o tipo de inscrição e valor de acordo com a idade
          const ageBasedValues = {
            isenta: { maxAge: 5, value: 0 },
            meia: { minAge: 6, maxAge: 10, value: 120 },
            normal: { minAge: 11, value: 200 },
            participação: { value: 200 },
            serviço: { value: 100 }
          };

          // Para o tipo de inscrição "normal", deve-se verificar a idade
          if (lowerCaseType === 'normal') {
            if (age <= 5) {
              typeToRecord = 'isenta';
              value = 0;
            } else if (age >= 6 && age <= 10) {
              typeToRecord = 'meia';
              value = 120;
            } else if (age >= 11) {
              typeToRecord = 'normal';
              value = 200;
            }
          } else {
            // Para outros tipos (participação e serviço), utilizar o valor diretamente
            const ageRule = ageBasedValues[lowerCaseType];
            if (ageRule) {
              value = ageRule.value;
            }
          }

          // Incrementar o contador para cada tipo de inscrição
          if (inscriptionCount[typeToRecord] !== undefined) {
            inscriptionCount[typeToRecord] += 1;
          }
        }
      });

      // Agora, consultamos as taxas de inscrição para o evento atual
      const currentEvent = await prisma.eventos.findFirst({
        where: { status: true },
        select: { id: true },
      });

      if (currentEvent) {
        const registrationFees = await prisma.tipo_inscricao.findMany({
          where: { evento_id: currentEvent.id },
        });

        // Preencher o objeto global com as taxas de inscrição para o evento atual
        registrationFees.forEach(fee => {
          eventRegistrationFees[fee.descricao.toLowerCase()] = fee;
        });

        // Calculando o total de cada tipo de inscrição
        const totals = {
          normal: inscriptionCount.normal * (eventRegistrationFees['normal']?.valor || 0),
          meia: inscriptionCount.meia * (eventRegistrationFees['meia']?.valor || 0),
          isenta: inscriptionCount.isenta * (eventRegistrationFees['isenta']?.valor || 0),
          participação: inscriptionCount.participação * (eventRegistrationFees['participação']?.valor || 0),
          serviço: inscriptionCount.serviço * (eventRegistrationFees['serviço']?.valor || 0),
        };

        // Exibir os resultados finais
        console.log('Contagem de Inscrições por Tipo:', inscriptionCount);
        console.log('Total por Tipo de Inscrição:', totals);
      }

      // Retornar os resultados com os dados de inscrição e total
      return res.status(200).json({
        status: "success",
        message: "Arquivo convertido para JSON com sucesso",
        data: {
          body: jsonData,  // Dados da planilha
          inscriptionCount: inscriptionCount,  // Contagem dos tipos de inscrição
          totals: totals  // Total por tipo de inscrição
        }
      });


    } catch (error) {
      console.log("Erro interno no servidor", error);
      return res.status(500).json({ message: "Erro interno no servidor" });
    }
  }
);

module.exports = registerRoutes;
