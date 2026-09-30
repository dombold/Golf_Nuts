-- Guest (temporary) players: unregistered players an organiser adds to an event or casual round.
ALTER TABLE "users" ADD COLUMN "isGuest" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "guestCreatedById" TEXT;
CREATE INDEX "users_isGuest_idx" ON "users"("isGuest");
ALTER TABLE "users" ADD CONSTRAINT "users_guestCreatedById_fkey" FOREIGN KEY ("guestCreatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Who set up the round (used to authorise guest reassignment). Null for rounds created before this.
ALTER TABLE "rounds" ADD COLUMN "createdById" TEXT;
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
