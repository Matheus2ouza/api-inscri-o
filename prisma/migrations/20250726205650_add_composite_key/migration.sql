/*
  Warnings:

  - A unique constraint covering the columns `[tipo,dia]` on the table `refeicao` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "refeicao_tipo_dia_key" ON "refeicao"("tipo", "dia");
