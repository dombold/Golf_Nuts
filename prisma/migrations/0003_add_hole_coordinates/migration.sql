-- Add coordinate fields to holes table for Google Maps Static API hole layout images
ALTER TABLE "holes" ADD COLUMN "teeLat"   DOUBLE PRECISION;
ALTER TABLE "holes" ADD COLUMN "teeLng"   DOUBLE PRECISION;
ALTER TABLE "holes" ADD COLUMN "greenLat" DOUBLE PRECISION;
ALTER TABLE "holes" ADD COLUMN "greenLng" DOUBLE PRECISION;
