-- Add username, firstName, lastName columns with temporary defaults for existing rows
ALTER TABLE "users" ADD COLUMN "username" TEXT;
ALTER TABLE "users" ADD COLUMN "firstName" TEXT;
ALTER TABLE "users" ADD COLUMN "lastName" TEXT;

-- Populate existing rows: use id as username, split name into firstName/lastName
UPDATE "users" SET
  "username" = id,
  "firstName" = SPLIT_PART(name, ' ', 1),
  "lastName" = CASE
    WHEN POSITION(' ' IN name) > 0 THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
    ELSE ''
  END;

-- Now apply NOT NULL constraints and unique index
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "lastName" SET NOT NULL;

-- Add unique constraint on username
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
