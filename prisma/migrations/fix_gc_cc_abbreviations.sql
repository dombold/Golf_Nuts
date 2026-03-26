-- Normalise Gc → Golf Club and Cc → Country Club (word-boundary safe)
UPDATE courses
SET name = REGEXP_REPLACE(
             REGEXP_REPLACE(name, '\yGc\y', 'Golf Club', 'g'),
             '\yCc\y', 'Country Club', 'g')
WHERE name ~ '\yGc\y' OR name ~ '\yCc\y';

-- One-off: El Caballo G C (spaced letters variant)
UPDATE courses SET name = 'El Caballo Golf Club' WHERE name = 'El Caballo G C';
