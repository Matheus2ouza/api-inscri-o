-- CreateTable
CREATE TABLE "event_rules" (
    "id" SERIAL NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "min_age" INTEGER,
    "max_age" INTEGER,
    "allow_male" BOOLEAN DEFAULT true,
    "allow_female" BOOLEAN DEFAULT true,

    CONSTRAINT "event_rules_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "event_rules" ADD CONSTRAINT "event_rules_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
