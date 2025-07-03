const { PrismaClient } = require('@prisma/client');
const e = require('express');
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

    console.log(rulesEvent)

    const typesInscription = await prisma.tipo_inscricao.findMany({
      where: { evento_id: eventId },
      select: {
        descricao: true,
        valor: true,
      }
    });

    console.log(typesInscription)

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

async function nameVerification(name, userId) {
  try {
    const inscription = await prisma.registration_details.findFirst({
      where: { localidade_id: userId }
    })

    if (!inscription) {
      return
    }

    const existingParticipant = await prisma.inscription_list.findFirst({
      where: { nome_completo: name },
    })

    if (existingParticipant) {
      return {
        exists: true,
      };
    }

  } catch (error) {
    console.error("Erro ao verificar nome:", error);
    throw new Error("Erro ao verificar nome.");
  }
}

module.exports = {
  rulesEvent
}