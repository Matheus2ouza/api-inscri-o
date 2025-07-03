/*
  Warnings:

  - A unique constraint covering the columns `[registration_details_id,nome_completo]` on the table `inscription_list` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "inscription_list_registration_details_id_nome_completo_key" ON "inscription_list"("registration_details_id", "nome_completo");
