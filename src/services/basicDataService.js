const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function eventService() {
  try{
    const events = await prisma.eventos.findMany({
      include: {
        tiposInscricao: {
          where: {
            valor: {
              gt: 0
            }
          },
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

module.exports = {
  eventService,
}