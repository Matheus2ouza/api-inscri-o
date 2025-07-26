-- CreateTable
CREATE TABLE "Tickets" (
    "id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "refeicaoId" TEXT NOT NULL,

    CONSTRAINT "Tickets_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Tickets" ADD CONSTRAINT "Tickets_refeicaoId_fkey" FOREIGN KEY ("refeicaoId") REFERENCES "refeicao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
