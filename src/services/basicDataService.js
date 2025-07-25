const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function eventService() {
  try{
    const events = await prisma.eventos.findMany({
      include: {
        tiposInscricao: {
          select: {
            descricao: true,
            valor: true
          }
        }
      }
    });

    console.log(`[basicDataService] sucesso ao tentar pegar os dados dos eventos`)
    return events
  }catch (err) {
    console.error("[basicDataService] Erro ao buscar os eventos:", err);
    throw err;
  }
}

async function listService() {
  try {
    const result = await prisma.inscription_list.findMany({
      select: {
        nome_completo: true,
        sexo: true,
        registration_details: {
          select: {
            localidade: {
              select: {
                nome: true
              }
            }
          }
        }
      }
    });

    // Primeiro, mapeia os dados
    const list = result.map((l) => ({
      nome: l.nome_completo,
      sexo: l.sexo,
      localidade: l.registration_details.localidade.nome
    }));

    // Agora, agrupa por localidade
    const grouped = {};
    list.forEach((item) => {
      const loc = item.localidade;
      if (!grouped[loc]) {
        grouped[loc] = [];
      }
      grouped[loc].push({
        nome: item.nome,
        sexo: item.sexo
      });
    });

    return grouped;

  } catch (err) {
    throw err;
  }
}


module.exports = {
  eventService,
  listService
}