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

        if(name) {
          inscriptionData[name] = {
            name: name,
            age: age
          }
        }
      });

      const inscriptionCount = {
        normal: 0,
        participação: 0,
        serviço: 0,
        meia: 0,  // Adicionando uma contagem de "meia" para as inscrições com valor 120
        isenta: 0, // Adicionando uma contagem de "isenta" para as inscrições com valor 0
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
          
          // Definindo a lógica de valor baseada na idade
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
      
          // Determinar o tipo de inscrição baseado na idade
          for (let typeKey in ageBasedValues) {
            const rule = ageBasedValues[typeKey];
      
            // Verificar se a idade se encaixa nos critérios para o tipo atual
            if ((rule.minAge === undefined || age >= rule.minAge) && (rule.maxAge === undefined || age <= rule.maxAge)) {
              typeToRecord = typeKey;
              value = rule.value;
              break; // Se encontrou uma correspondência, podemos sair do loop
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
      
        // Agora, calculamos o total para cada tipo de inscrição baseado nas contagens e valores
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

    // Retorna o JSON com os dados da planilha e a contagem dos tipos de inscrição
    return res.status(200).json({
      data: {
        body: jsonData,              // Dados da planilha
        inscriptionData: inscriptionData,  // Dados do tipo de inscrição, se houver
        inscriptionCount: inscriptionCount // Contagem dos tipos de inscrição
      }
    });

    } catch (error) {
      console.log("Erro interno no servidor", error);
      return res.status(500).json({ message: "Erro interno no servidor" });
    }
  }
);

module.exports = registerRoutes;
