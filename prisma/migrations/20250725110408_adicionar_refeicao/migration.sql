-- CreateEnum
CREATE TYPE "TipoRefeicao" AS ENUM ('CAFE', 'ALMOCO', 'JANTA');

-- CreateEnum
CREATE TYPE "DiaSemana" AS ENUM ('SEXTA', 'SABADO', 'DOMINGO');

-- CreateTable
CREATE TABLE "Refeicao" (
    "id" TEXT NOT NULL,
    "tipo" "TipoRefeicao" NOT NULL,
    "dia" "DiaSemana" NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "quantidadeVendida" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Refeicao_pkey" PRIMARY KEY ("id")
);
