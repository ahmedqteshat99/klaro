-- Ensure user files bucket is private
UPDATE storage.buckets
SET public = false
WHERE id = 'user-files';
