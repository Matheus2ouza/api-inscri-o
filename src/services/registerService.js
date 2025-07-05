const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function rulesEventService(eventId) {
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
        id: true,
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

async function nameVerificationService(name, userId) {
  try {
    const existingParticipant = await prisma.inscription_list.findFirst({
      where: {
        nome_completo: name,
        registration_details: {
          localidade_id: userId,
        },
      },
    });

    if (existingParticipant) {
      return {
        exists: true,
      };
    }

    return {
      exists: false,
    };

  } catch (error) {
    console.error("Erro ao verificar nome:", error);
    throw new Error("Erro ao verificar nome.");
  }
}

async function registerService(data, eventSelectedId, userId) {
  try {
    const { responsible, outstandingBalance, totalparticipants, participants } = data;

    const result = await prisma.$transaction(async (tx) => {
      console.log(`[RegisterService] Iniciando transação para registrar participantes`);

      const registerDetails = await tx.registration_details.create({
        data: {
          evento_id: eventSelectedId,
          localidade_id: userId,
          responsavel: responsible,
          quantidade_inscritos: totalparticipants,
          saldo_devedor: outstandingBalance,
          status: 'pendente',
          data_inscricao: new Date(),
        }
      });

      console.log(`[RegisterService] Registro de detalhes da inscrição criado`);

      await tx.inscription_list.createMany({
        data: participants.map(p => ({
          registration_details_id: registerDetails.id,
          nome_completo: p.nome_completo,
          idade: p.idade,
          tipo_inscricao_id: p.tipo_inscricao_id,
          sexo: p.sexo,
        })),
        skipDuplicates: true,
      });

      console.log(`[RegisterService] Lista de inscrições criada com sucesso`);
      await tx.localidades.update({
        where: { id: userId},
        data: { 
          saldo_devedor: {
            increment: outstandingBalance
          }
        }
      })
      
      console.log(`[RegisterService] Saldo da localidade atualizado`)

      return registerDetails;
    });

    return result;
  } catch (error) {
    console.error("[RegisterService] Erro ao registrar participantes:", error);
    throw new Error("Erro ao registrar participantes.");
  }
}

async function listRegisterService(userId) {
  try {
    const registrations = await prisma.registration_details.findMany({
      where: { localidade_id: userId },
      include: {
        inscritos: true,
        evento: true,
      },
      orderBy: { data_inscricao: 'desc' }
    });

    return registrations;
  } catch (error) {
    console.error("Erro ao listar registros:", error);
    throw new Error("Erro ao listar registros.");
  }
  
}



module.exports = {
  rulesEventService,
  nameVerificationService,
  registerService,
  listRegisterService
}