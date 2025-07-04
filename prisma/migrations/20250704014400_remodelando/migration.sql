/*
  Warnings:

  - Added the required column `registration_details_id` to the `comprovantes` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "comprovantes" DROP CONSTRAINT "comprovantes_localidade_id_fkey";

-- AlterTable
ALTER TABLE "comprovantes" ADD COLUMN     "registration_details_id" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "comprovantes" ADD CONSTRAINT "comprovantes_localidade_id_fkey" FOREIGN KEY ("localidade_id") REFERENCES "localidades"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprovantes" ADD CONSTRAINT "comprovantes_registration_details_id_fkey" FOREIGN KEY ("registration_details_id") REFERENCES "registration_details"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
