const { PrismaClient } = require('@prisma/client');
const { verify } = require('jsonwebtoken');
const { text } = require('pdfkit');
const prisma = new PrismaClient();

async function registerPayment(userId, registrationDetailsId, valuePaid, datePayment, comprovantePagamento, tipoArquivo) {
  try {
    const verifyRegister = await prisma.registration_details.findFirst({
      where: {id: registrationDetailsId}
    })

    if(!verifyRegister) {
      console.warn(`[PaymentServices] Nenhum registro encontrado com o id: ${registrationDetailsId}`)
    }

    const result = await prisma.$transaction( async (tx) => {
      console.log(`[PaymentServices] Inicianado transação para registrar pagamento`)

      const paymentReceipt = await tx.comprovantes.create({
        data: {
          localidade_id: userId,
          registration_details_id: registrationDetailsId,
          comprovante_imagem: comprovantePagamento,
          date_pagamento: datePayment,
          tipo_arquivo: tipoArquivo,
          valor_pago: valuePaid
        }
      });

      console.log(`[PaymentServices] Comprovante guardado com sucesso`);

      await tx.registration_details.update({
        data: {
          saldo_devedor: {
            decrement: valuePaid
          }
        }
      });

      console.log(`[PaymentServices] Valor abatido da inscrição`);

      await tx.localidades.update({
        data: {
          saldo_devedor: {
            decrement: valuePaid
          }
        }
      });

      console.log(`[PaymentServices] Valor abatido da localidade`);
      console.log(`[PaymentServices] Transação feita com sucesso`);
      return paymentReceipt
    })

    return result
  } catch (error) {
    console.warn(`[PaymentServices] Erro ao registar pagamento`)
    throw new Error("Erro ao tentar registrar o pagamento")
  }
}

module.exports = {
  registerPayment,
}