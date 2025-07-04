const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function registerPayment(userId, registrationDetailsId, valuePaid, comprovantePagamento, tipoArquivo) {
  try {
    // Verifica se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Verifica se os detalhes da inscrição existem
    const registrationDetails = await prisma.registration_details.findUnique({
      where: { id: registrationDetailsId },
    });

    if (!registrationDetails) {
      throw new Error('Detalhes da inscrição não encontrados');
    }

    // Cria o registro de pagamento
    const payment = await prisma.comprovantes.create({
      data: {
        localidade_id: registrationDetails.localidade_id,
        registration_details_id: registrationDetailsId,
        comprovante_imagem: comprovantePagamento,
        tipo_arquivo: tipoArquivo,
        valor_pago: valuePaid,
      },
    });

    return payment;
  } catch (error) {
    console.error('Erro ao registrar pagamento:', error);
    throw new Error('Erro ao registrar pagamento: ' + error.message);
  }
}

module.exports = {
  registerPayment,
}