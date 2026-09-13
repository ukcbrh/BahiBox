import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;
const client = new Client({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME,
});

async function run() {
  await client.connect();
  try {
    const sql = `
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to select units" ON units;
DROP POLICY IF EXISTS "Allow authenticated users to insert units" ON units;
DROP POLICY IF EXISTS "Allow authenticated users to update units" ON units;
DROP POLICY IF EXISTS "Allow authenticated users to delete units" ON units;

CREATE POLICY "Allow authenticated users to select units" ON units FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert units" ON units FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update units" ON units FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete units" ON units FOR DELETE TO authenticated USING (true);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to select product_categories" ON product_categories;
DROP POLICY IF EXISTS "Allow authenticated users to insert product_categories" ON product_categories;
DROP POLICY IF EXISTS "Allow authenticated users to update product_categories" ON product_categories;
DROP POLICY IF EXISTS "Allow authenticated users to delete product_categories" ON product_categories;

CREATE POLICY "Allow authenticated users to select product_categories" ON product_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert product_categories" ON product_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update product_categories" ON product_categories FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete product_categories" ON product_categories FOR DELETE TO authenticated USING (true);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to select products" ON products;
DROP POLICY IF EXISTS "Allow authenticated users to insert products" ON products;
DROP POLICY IF EXISTS "Allow authenticated users to update products" ON products;
DROP POLICY IF EXISTS "Allow authenticated users to delete products" ON products;

CREATE POLICY "Allow authenticated users to select products" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert products" ON products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update products" ON products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete products" ON products FOR DELETE TO authenticated USING (true);
    `;
    await client.query(sql);
    console.log("SQL executed successfully!");
  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}
run();
