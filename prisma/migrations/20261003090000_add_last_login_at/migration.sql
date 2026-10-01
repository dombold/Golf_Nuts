-- Most recent successful sign-in, for the admin Activity tab. Set with raw SQL so it doesn't bump "updatedAt".
ALTER TABLE "users" ADD COLUMN "lastLoginAt" TIMESTAMP(3);
