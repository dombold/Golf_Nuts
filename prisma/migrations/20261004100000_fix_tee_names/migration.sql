-- Course data audit (2026-10-02): tee names corrected in data/wa_courses_full.json.
-- Renamed in place (ids kept, so existing rounds keep their tee) before the seed runs,
-- otherwise the seed would create a second tee under the new name. Each statement is a
-- no-op where the course or tee doesn't exist.

UPDATE "tees" SET "name" = 'White (Ladies)' FROM "courses" WHERE "tees"."courseId" = "courses"."id" AND "courses"."externalId" = '8463' AND "tees"."name" = 'White';
UPDATE "tees" SET "name" = 'White (Ladies)' FROM "courses" WHERE "tees"."courseId" = "courses"."id" AND "courses"."externalId" = '9079' AND "tees"."name" = 'White';
UPDATE "tees" SET "name" = 'White (Ladies)' FROM "courses" WHERE "tees"."courseId" = "courses"."id" AND "courses"."externalId" = '8959' AND "tees"."name" = 'White';
UPDATE "tees" SET "name" = 'White (Ladies)' FROM "courses" WHERE "tees"."courseId" = "courses"."id" AND "courses"."externalId" = '8430' AND "tees"."name" = 'White';
UPDATE "tees" SET "name" = 'Blue (Ladies)' FROM "courses" WHERE "tees"."courseId" = "courses"."id" AND "courses"."externalId" = '25432' AND "tees"."name" = 'Blue';
UPDATE "tees" SET "name" = 'Blue (Ladies)' FROM "courses" WHERE "tees"."courseId" = "courses"."id" AND "courses"."externalId" = '8622' AND "tees"."name" = 'Blue';
UPDATE "tees" SET "name" = 'Blue (Ladies)' FROM "courses" WHERE "tees"."courseId" = "courses"."id" AND "courses"."externalId" = '25471' AND "tees"."name" = 'Blue';
UPDATE "tees" SET "name" = 'White (Ladies)' FROM "courses" WHERE "tees"."courseId" = "courses"."id" AND "courses"."externalId" = '8586' AND "tees"."name" = 'White';
UPDATE "tees" SET "name" = 'Blue (Ladies)' FROM "courses" WHERE "tees"."courseId" = "courses"."id" AND "courses"."externalId" = '8602' AND "tees"."name" = 'Blue';
UPDATE "tees" SET "name" = 'White (Ladies)' FROM "courses" WHERE "tees"."courseId" = "courses"."id" AND "courses"."externalId" = '25792' AND "tees"."name" = 'White';
UPDATE "tees" SET "name" = 'White (Ladies)' FROM "courses" WHERE "tees"."courseId" = "courses"."id" AND "courses"."externalId" = '8427' AND "tees"."name" = 'White';
UPDATE "tees" SET "name" = 'White (Island/Lake)' FROM "courses" WHERE "tees"."courseId" = "courses"."id" AND "courses"."externalId" = '11301' AND "tees"."name" = 'White (Island/Lakes)';
UPDATE "tees" SET "name" = 'Red (Pines/Lake)' FROM "courses" WHERE "tees"."courseId" = "courses"."id" AND "courses"."externalId" = '11116' AND "tees"."name" = 'Red (Pines/Lakes)';
