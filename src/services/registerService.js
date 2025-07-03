const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function rulesEvent(eventId) {
  try {
    const rulesEvent = await prisma.event_rules.findFirst({
      where: { evento_id: eventId },
      select: {
        min_age: true,
        max_age: true,
        allow_male: true,
        allow_female: true
      }
    });

    const typesInscription = await prisma.tipo_inscricao.findMany({
      where: { evento_id: eventId },
      select: {
        descricao: true,
        valor: true,
      }
    });

    if (!rulesEvent) {
      throw new Error("Regras do evento não encontradas.");
    }

    return {
      ...rulesEvent,
      tipos_inscricao: typesInscription
    };

  } catch (error) {
    console.error("Erro ao buscar regras do evento:", error);
    throw new Error("Erro ao buscar regras do evento.");
  }
}

module.exports = {
  rulesEvent
}