/*
  Warnings:

  - You are about to drop the `Tickets` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Tickets" DROP CONSTRAINT "Tickets_refeicaoId_fkey";

-- DropTable
DROP TABLE "Tickets";

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "refeicaoId" TEXT NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_refeicaoId_fkey" FOREIGN KEY ("refeicaoId") REFERENCES "refeicao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
