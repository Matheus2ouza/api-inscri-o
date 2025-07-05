/*
  Warnings:

  - Added the required column `data_pagamento` to the `comprovantes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "comprovantes" ADD COLUMN     "data_pagamento" DATE NOT NULL;
