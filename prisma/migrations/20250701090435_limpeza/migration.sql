/*
  Warnings:

  - You are about to drop the column `status` on the `eventos` table. All the data in the column will be lost.
  - You are about to alter the column `valor` on the `pagamento_avulso` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - You are about to drop the `email_verification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `hospedagem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inscricao_0_6` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inscricao_10_acima` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inscricao_7_10` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inscricao_geral` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inscricao_servico` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inscricao_tx_participacao` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "autenticacao_localidades" DROP CONSTRAINT "fk_localidade";

-- DropForeignKey
ALTER TABLE "comprovantes" DROP CONSTRAINT "comprovantes_localidade_id_fkey";

-- DropForeignKey
ALTER TABLE "email_verification" DROP CONSTRAINT "fk_localidade";

-- DropForeignKey
ALTER TABLE "hospedagem" DROP CONSTRAINT "hospedagem_id_inscricao_fkey";

-- DropForeignKey
ALTER TABLE "inscricao_0_6" DROP CONSTRAINT "inscricao_0_6_inscricao_geral_id_fkey";

-- DropForeignKey
ALTER TABLE "inscricao_0_6" DROP CONSTRAINT "inscricao_0_6_tipo_inscricao_id_fkey";

-- DropForeignKey
ALTER TABLE "inscricao_10_acima" DROP CONSTRAINT "inscricao_10_acima_inscricao_geral_id_fkey";

-- DropForeignKey
ALTER TABLE "inscricao_10_acima" DROP CONSTRAINT "inscricao_10_acima_tipo_inscricao_id_fkey";

-- DropForeignKey
ALTER TABLE "inscricao_7_10" DROP CONSTRAINT "inscricao_7_10_inscricao_geral_id_fkey";

-- DropForeignKey
ALTER TABLE "inscricao_7_10" DROP CONSTRAINT "inscricao_7_10_tipo_inscricao_id_fkey";

-- DropForeignKey
ALTER TABLE "inscricao_avulsa" DROP CONSTRAINT "inscricao_avulsa2_evento_id_fkey";

-- DropForeignKey
ALTER TABLE "inscricao_avulsa" DROP CONSTRAINT "inscricao_avulsa2_localidade_id_fkey";

-- DropForeignKey
ALTER TABLE "inscricao_geral" DROP CONSTRAINT "fk_evento";

-- DropForeignKey
ALTER TABLE "inscricao_geral" DROP CONSTRAINT "inscricao_geral_localidade_id_fkey";

-- DropForeignKey
ALTER TABLE "inscricao_servico" DROP CONSTRAINT "inscricao_servico_inscricao_geral_id_fkey";

-- DropForeignKey
ALTER TABLE "inscricao_servico" DROP CONSTRAINT "inscricao_servico_tipo_inscricao_id_fkey";

-- DropForeignKey
ALTER TABLE "inscricao_tx_participacao" DROP CONSTRAINT "inscricao_tx_participacao_inscricao_geral_id_fkey";

-- DropForeignKey
ALTER TABLE "inscricao_tx_participacao" DROP CONSTRAINT "inscricao_tx_participacao_tipo_inscricao_id_fkey";

-- DropForeignKey
ALTER TABLE "pagamento_alimentacao" DROP CONSTRAINT "pagamento_alimentacao_venda_alimentacao_id_fkey";

-- DropForeignKey
ALTER TABLE "pagamento_avulso" DROP CONSTRAINT "pagamento_avulso_inscricao_avulsa2_id_fkey";

-- DropForeignKey
ALTER TABLE "tipo_inscricao" DROP CONSTRAINT "fk_evento";

-- DropForeignKey
ALTER TABLE "venda_alimentacao" DROP CONSTRAINT "venda_alimentacao_evento_id_fkey";

-- AlterTable
ALTER TABLE "autenticacao_localidades" RENAME CONSTRAINT "autenticacao_pkey" TO "autenticacao_localidades_pkey";

-- AlterTable
ALTER TABLE "eventos" DROP COLUMN "status";

-- AlterTable
ALTER TABLE "inscricao_avulsa" RENAME CONSTRAINT "inscricao_avulsa2_pkey" TO "inscricao_avulsa_pkey";

-- AlterTable
ALTER TABLE "pagamento_avulso" ALTER COLUMN "valor" SET DATA TYPE DECIMAL(10,2);

-- DropTable
DROP TABLE "email_verification";

-- DropTable
DROP TABLE "hospedagem";

-- DropTable
DROP TABLE "inscricao_0_6";

-- DropTable
DROP TABLE "inscricao_10_acima";

-- DropTable
DROP TABLE "inscricao_7_10";

-- DropTable
DROP TABLE "inscricao_geral";

-- DropTable
DROP TABLE "inscricao_servico";

-- DropTable
DROP TABLE "inscricao_tx_participacao";

-- AddForeignKey
ALTER TABLE "autenticacao_localidades" ADD CONSTRAINT "autenticacao_localidades_localidade_id_fkey" FOREIGN KEY ("localidade_id") REFERENCES "localidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipo_inscricao" ADD CONSTRAINT "tipo_inscricao_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprovantes" ADD CONSTRAINT "comprovantes_localidade_id_fkey" FOREIGN KEY ("localidade_id") REFERENCES "localidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscricao_avulsa" ADD CONSTRAINT "inscricao_avulsa_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscricao_avulsa" ADD CONSTRAINT "inscricao_avulsa_localidade_id_fkey" FOREIGN KEY ("localidade_id") REFERENCES "localidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamento_alimentacao" ADD CONSTRAINT "pagamento_alimentacao_venda_alimentacao_id_fkey" FOREIGN KEY ("venda_alimentacao_id") REFERENCES "venda_alimentacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamento_avulso" ADD CONSTRAINT "pagamento_avulso_inscricao_avulsa2_id_fkey" FOREIGN KEY ("inscricao_avulsa2_id") REFERENCES "inscricao_avulsa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venda_alimentacao" ADD CONSTRAINT "venda_alimentacao_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
