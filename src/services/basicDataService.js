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

    // Mapeia os dados com nome, sexo e localidade
    const list = result.map((l) => ({
      nome: l.nome_completo,
      sexo: l.sexo,
      localidade: l.registration_details.localidade.nome
    }));

    // Agrupa e conta por localidade
    const grouped = {};

    list.forEach((item) => {
      const loc = item.localidade;

      // Inicializa se ainda não existir
      if (!grouped[loc]) {
        grouped[loc] = {
          total: 0,
          masculino: 0,
          feminino: 0,
          participantes: []
        };
      }

      // Atualiza contagens
      grouped[loc].total++;
      if (item.sexo.toLowerCase() === 'masculino') {
        grouped[loc].masculino++;
      } else if (item.sexo.toLowerCase() === 'feminino') {
        grouped[loc].feminino++;
      }

      // Adiciona participante à lista
      grouped[loc].participantes.push({
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