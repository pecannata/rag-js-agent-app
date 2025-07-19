-- Change primary key from 'id' to 'title' in blog_posts table

-- Step 1: Truncate the table to remove all data
TRUNCATE TABLE blog_posts;

-- Step 2: Drop the existing primary key constraint
-- Oracle automatically names the constraint, so we need to find it first
-- First, let's check if there are any constraints
SELECT constraint_name, constraint_type 
FROM user_constraints 
WHERE table_name = 'BLOG_POSTS' AND constraint_type = 'P';

-- Drop the primary key constraint (replace with actual name if different)
ALTER TABLE blog_posts DROP CONSTRAINT SYS_C00xxxxxxx CASCADE;

-- Step 3: Drop the identity column specification from the id column
ALTER TABLE blog_posts MODIFY id NUMBER;

-- Step 4: Make title the primary key
-- First ensure title is NOT NULL
ALTER TABLE blog_posts MODIFY title VARCHAR2(500) NOT NULL;

-- Add primary key constraint on title
ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_pk PRIMARY KEY (title);

-- Step 5: Update the unique constraint on slug since we no longer need id-based uniqueness
-- The slug constraint should remain as is since slugs should still be unique

-- Display the updated table structure
DESCRIBE blog_posts;

-- Show constraints
SELECT constraint_name, constraint_type, search_condition 
FROM user_constraints 
WHERE table_name = 'BLOG_POSTS';
