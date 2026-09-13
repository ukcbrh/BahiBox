-- Add more missing columns to retail_customers table
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS gstin VARCHAR(50);
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE retail_customers ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);

-- Add more missing columns to suppliers table
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS gstin VARCHAR(50);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);

-- Make sure we reload the schema cache so the PostgREST API recognizes the new columns
NOTIFY pgrst, 'reload schema';
