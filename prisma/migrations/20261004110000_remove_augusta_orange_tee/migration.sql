-- Augusta Golf Club's Orange tee was removed from data/wa_courses_full.json (it was the only
-- incomplete tee there). The seed never deletes tees, so remove it here; its holes cascade.
-- Skipped if any round, event or event group has ever used it (those references block deletes).
DELETE FROM "tees"
USING "courses"
WHERE "tees"."courseId" = "courses"."id"
  AND "courses"."externalId" = '5707'
  AND "tees"."name" = 'Orange'
  AND NOT EXISTS (SELECT 1 FROM "rounds" WHERE "rounds"."teeId" = "tees"."id")
  AND NOT EXISTS (SELECT 1 FROM "tournaments" WHERE "tournaments"."teeId" = "tees"."id")
  AND NOT EXISTS (SELECT 1 FROM "tournament_groups" WHERE "tournament_groups"."teeId" = "tees"."id");
