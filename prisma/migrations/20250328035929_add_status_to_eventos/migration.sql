-- CreateTable
CREATE TABLE "autenticacao_localidades" (
    "localidade_id" INTEGER NOT NULL,
    "senha_hash" VARCHAR(512) NOT NULL,
    "salt" VARCHAR(32) NOT NULL,
    "algoritmo" VARCHAR(20) NOT NULL DEFAULT 'bcrypt',
    "data_atualizacao" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "autenticacao_pkey" PRIMARY KEY ("localidade_id")
);

-- CreateTable
CREATE TABLE "caixa" (
    "id" SERIAL NOT NULL,
    "descricao" TEXT NOT NULL,
    "responsavel" VARCHAR(255) NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "tipomovimento" VARCHAR(50) NOT NULL,
    "data" DATE NOT NULL,

    CONSTRAINT "caixa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comprovantes" (
    "id" SERIAL NOT NULL,
    "localidade_id" INTEGER NOT NULL,
    "comprovante_imagem" BYTEA NOT NULL,
    "tipo_arquivo" VARCHAR(100),
    "valor_pago" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "comprovantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification" (
    "id" SERIAL NOT NULL,
    "localidade_id" INTEGER NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "status" BOOLEAN DEFAULT false,

    CONSTRAINT "email_verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" SERIAL NOT NULL,
    "descricao" VARCHAR(200) NOT NULL,
    "data_limite" DATE NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospedagem" (
    "id" SERIAL NOT NULL,
    "id_inscricao" INTEGER NOT NULL,
    "nome" VARCHAR(255) NOT NULL,

    CONSTRAINT "hospedagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscricao_0_6" (
    "id" SERIAL NOT NULL,
    "inscricao_geral_id" INTEGER,
    "tipo_inscricao_id" INTEGER,
    "qtd_masculino" INTEGER DEFAULT 0,
    "qtd_feminino" INTEGER DEFAULT 0,

    CONSTRAINT "inscricao_0_6_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscricao_10_acima" (
    "id" SERIAL NOT NULL,
    "inscricao_geral_id" INTEGER,
    "tipo_inscricao_id" INTEGER,
    "qtd_masculino" INTEGER DEFAULT 0,
    "qtd_feminino" INTEGER DEFAULT 0,

    CONSTRAINT "inscricao_10_acima_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscricao_7_10" (
    "id" SERIAL NOT NULL,
    "inscricao_geral_id" INTEGER,
    "tipo_inscricao_id" INTEGER,
    "qtd_masculino" INTEGER DEFAULT 0,
    "qtd_feminino" INTEGER DEFAULT 0,

    CONSTRAINT "inscricao_7_10_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscricao_avulsa" (
    "id" SERIAL NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "localidade_id" INTEGER NOT NULL,
    "qtd_0_6" INTEGER NOT NULL DEFAULT 0,
    "qtd_7_10" INTEGER NOT NULL DEFAULT 0,
    "qtd_10_normal" INTEGER NOT NULL DEFAULT 0,
    "qtd_visitante" INTEGER NOT NULL DEFAULT 0,
    "data" DATE,
    "nome_responsavel" VARCHAR(255),

    CONSTRAINT "inscricao_avulsa2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscricao_geral" (
    "id" SERIAL NOT NULL,
    "localidade_id" INTEGER,
    "nome_responsavel" VARCHAR(100) NOT NULL,
    "qtd_geral" INTEGER,
    "evento_id" INTEGER,

    CONSTRAINT "inscricao_geral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscricao_servico" (
    "id" SERIAL NOT NULL,
    "inscricao_geral_id" INTEGER,
    "tipo_inscricao_id" INTEGER,
    "qtd_masculino" INTEGER DEFAULT 0,
    "qtd_feminino" INTEGER DEFAULT 0,

    CONSTRAINT "inscricao_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscricao_tx_participacao" (
    "id" SERIAL NOT NULL,
    "inscricao_geral_id" INTEGER,
    "tipo_inscricao_id" INTEGER,
    "qtd_masculino" INTEGER DEFAULT 0,
    "qtd_feminino" INTEGER DEFAULT 0,

    CONSTRAINT "inscricao_tx_participacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "localidades" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "saldo_devedor" DECIMAL(10,2) DEFAULT 0.00,
    "status" BOOLEAN DEFAULT false,
    "role" VARCHAR(50) DEFAULT 'user',

    CONSTRAINT "localidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacao_financeira" (
    "id" SERIAL NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "descricao" VARCHAR(255),
    "valor" DECIMAL(10,2) NOT NULL,
    "data" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacao_financeira_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamento_alimentacao" (
    "id" SERIAL NOT NULL,
    "venda_alimentacao_id" INTEGER NOT NULL,
    "tipo_pagamento" VARCHAR(100) NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "pagamento_alimentacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamento_avulso" (
    "id" SERIAL NOT NULL,
    "inscricao_avulsa2_id" INTEGER NOT NULL,
    "tipo_pagamento" VARCHAR(100) NOT NULL,
    "valor" INTEGER NOT NULL,

    CONSTRAINT "pagamento_avulso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipo_inscricao" (
    "id" SERIAL NOT NULL,
    "descricao" VARCHAR(50) NOT NULL,
    "valor" DECIMAL(10,2),
    "evento_id" INTEGER,

    CONSTRAINT "tipo_inscricao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venda_alimentacao" (
    "id" SERIAL NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "tipo_refeicao" VARCHAR(100) NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "valor_unitario" DECIMAL(10,2) NOT NULL,
    "valor_total" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "venda_alimentacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_email_key" ON "email_verification"("email");

-- AddForeignKey
ALTER TABLE "autenticacao_localidades" ADD CONSTRAINT "fk_localidade" FOREIGN KEY ("localidade_id") REFERENCES "localidades"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "comprovantes" ADD CONSTRAINT "comprovantes_localidade_id_fkey" FOREIGN KEY ("localidade_id") REFERENCES "localidades"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "email_verification" ADD CONSTRAINT "fk_localidade" FOREIGN KEY ("localidade_id") REFERENCES "localidades"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hospedagem" ADD CONSTRAINT "hospedagem_id_inscricao_fkey" FOREIGN KEY ("id_inscricao") REFERENCES "inscricao_geral"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inscricao_0_6" ADD CONSTRAINT "inscricao_0_6_inscricao_geral_id_fkey" FOREIGN KEY ("inscricao_geral_id") REFERENCES "inscricao_geral"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inscricao_0_6" ADD CONSTRAINT "inscricao_0_6_tipo_inscricao_id_fkey" FOREIGN KEY ("tipo_inscricao_id") REFERENCES "tipo_inscricao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inscricao_10_acima" ADD CONSTRAINT "inscricao_10_acima_inscricao_geral_id_fkey" FOREIGN KEY ("inscricao_geral_id") REFERENCES "inscricao_geral"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inscricao_10_acima" ADD CONSTRAINT "inscricao_10_acima_tipo_inscricao_id_fkey" FOREIGN KEY ("tipo_inscricao_id") REFERENCES "tipo_inscricao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inscricao_7_10" ADD CONSTRAINT "inscricao_7_10_inscricao_geral_id_fkey" FOREIGN KEY ("inscricao_geral_id") REFERENCES "inscricao_geral"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inscricao_7_10" ADD CONSTRAINT "inscricao_7_10_tipo_inscricao_id_fkey" FOREIGN KEY ("tipo_inscricao_id") REFERENCES "tipo_inscricao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inscricao_avulsa" ADD CONSTRAINT "inscricao_avulsa2_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inscricao_avulsa" ADD CONSTRAINT "inscricao_avulsa2_localidade_id_fkey" FOREIGN KEY ("localidade_id") REFERENCES "localidades"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inscricao_geral" ADD CONSTRAINT "fk_evento" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscricao_geral" ADD CONSTRAINT "inscricao_geral_localidade_id_fkey" FOREIGN KEY ("localidade_id") REFERENCES "localidades"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inscricao_servico" ADD CONSTRAINT "inscricao_servico_inscricao_geral_id_fkey" FOREIGN KEY ("inscricao_geral_id") REFERENCES "inscricao_geral"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inscricao_servico" ADD CONSTRAINT "inscricao_servico_tipo_inscricao_id_fkey" FOREIGN KEY ("tipo_inscricao_id") REFERENCES "tipo_inscricao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inscricao_tx_participacao" ADD CONSTRAINT "inscricao_tx_participacao_inscricao_geral_id_fkey" FOREIGN KEY ("inscricao_geral_id") REFERENCES "inscricao_geral"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inscricao_tx_participacao" ADD CONSTRAINT "inscricao_tx_participacao_tipo_inscricao_id_fkey" FOREIGN KEY ("tipo_inscricao_id") REFERENCES "tipo_inscricao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pagamento_alimentacao" ADD CONSTRAINT "pagamento_alimentacao_venda_alimentacao_id_fkey" FOREIGN KEY ("venda_alimentacao_id") REFERENCES "venda_alimentacao"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pagamento_avulso" ADD CONSTRAINT "pagamento_avulso_inscricao_avulsa2_id_fkey" FOREIGN KEY ("inscricao_avulsa2_id") REFERENCES "inscricao_avulsa"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tipo_inscricao" ADD CONSTRAINT "fk_evento" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "venda_alimentacao" ADD CONSTRAINT "venda_alimentacao_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
