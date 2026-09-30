-- Administrators: act as organiser on every event and casual round, and manage members from /admin.
ALTER TABLE "users" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "admin_audit_log" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_audit_log_createdAt_idx" ON "admin_audit_log"("createdAt");

ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The first administrators
UPDATE "users" SET "isAdmin" = true WHERE "username" IN ('Dominic', 'Mikeffernando');
