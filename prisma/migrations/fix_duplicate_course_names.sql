-- One-off cleanup: remove duplicate second half from course names like "X — X"
-- Leaves names like "Collier Park Golf Course — Island/ Lake" untouched.
UPDATE courses
SET name = SPLIT_PART(name, ' — ', 1)
WHERE name LIKE '% — %'
  AND LOWER(TRIM(SPLIT_PART(name, ' — ', 1))) = LOWER(TRIM(SPLIT_PART(name, ' — ', 2)));
