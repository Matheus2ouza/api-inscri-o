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
  try{
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
    })

    console.log(result.localidade)

    const list = {
      name: result.nome_completo,
      sexo: result.sexo,
      localidade: result.registration_details.localidade.nome
    }
    
    return list
  } catch (err) {
    throw err
  }
}

module.exports = {
  eventService,
  listService
}