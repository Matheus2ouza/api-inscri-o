const { PrismaClient } = require('@prisma/client');
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
        where: {id: registrationDetailsId},
        data: {
          saldo_devedor: {
            decrement: valuePaid
          }
        }
      });

      console.log(`[PaymentServices] Valor abatido da inscrição`);

      await tx.localidades.update({
        where: {id: userId},
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
    const base64Image = Buffer.from(result.comprovante_imagem).toString('base64');

    return {
      comprovante_imagem: base64Image,
      ...result
    }
  } catch (error) {
    console.warn(`[PaymentServices] Erro ao registar pagamento`)
    throw error
  }
}

module.exports = {
  registerPayment,
}