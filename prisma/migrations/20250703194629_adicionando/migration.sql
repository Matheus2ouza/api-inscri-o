/*
  Warnings:

  - Added the required column `tipo_inscricao_id` to the `inscription_list` table without a default value. This is not possible if the table is not empty.
  - Added the required column `responsavel` to the `registration_details` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "inscription_list" ADD COLUMN     "tipo_inscricao_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "registration_details" ADD COLUMN     "responsavel" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "inscription_list" ADD CONSTRAINT "inscription_list_tipo_inscricao_id_fkey" FOREIGN KEY ("tipo_inscricao_id") REFERENCES "tipo_inscricao"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
