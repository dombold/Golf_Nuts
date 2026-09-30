-- Skins: whether a halved hole's skin carries over to the next hole (default: yes, as before)
ALTER TABLE "tournaments" ADD COLUMN "skinsCarryOver" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "rounds" ADD COLUMN "skinsCarryOver" BOOLEAN NOT NULL DEFAULT true;
