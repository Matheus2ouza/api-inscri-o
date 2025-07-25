/*
  Warnings:

  - You are about to drop the `Refeicao` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Refeicao";

-- CreateTable
CREATE TABLE "refeicao" (
    "id" TEXT NOT NULL,
    "tipo" "TipoRefeicao" NOT NULL,
    "dia" "DiaSemana" NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "quantidadeVendida" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refeicao_pkey" PRIMARY KEY ("id")
);
