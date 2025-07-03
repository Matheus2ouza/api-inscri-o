-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('pendente', 'pago', 'cancelado');

-- CreateTable
CREATE TABLE "registration_details" (
    "id" SERIAL NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "localidade_id" INTEGER NOT NULL,
    "quantidade_inscritos" INTEGER NOT NULL,
    "saldo_devedor" DECIMAL(10,2),
    "status" "RegistrationStatus" NOT NULL DEFAULT 'pendente',
    "data_inscricao" DATE NOT NULL,

    CONSTRAINT "registration_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscription_list" (
    "id" SERIAL NOT NULL,
    "registration_details_id" INTEGER NOT NULL,
    "nome_completo" VARCHAR(255) NOT NULL,
    "idade" INTEGER NOT NULL,
    "sexo" VARCHAR(20) NOT NULL,

    CONSTRAINT "inscription_list_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "registration_details" ADD CONSTRAINT "registration_details_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_details" ADD CONSTRAINT "registration_details_localidade_id_fkey" FOREIGN KEY ("localidade_id") REFERENCES "localidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscription_list" ADD CONSTRAINT "inscription_list_registration_details_id_fkey" FOREIGN KEY ("registration_details_id") REFERENCES "registration_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;
