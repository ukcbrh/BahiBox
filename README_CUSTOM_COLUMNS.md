# Setup Instructions for Dynamic Columns

To make the Custom Columns functionality work and to fix the Row Level Security (RLS) issues you were seeing (`new row violates row-level security policy for table "units"`), you need to run the generated SQL script in your Supabase SQL Editor.

1. Go to your **Supabase Dashboard**.
2. Navigate to the **SQL Editor** on the left menu.
3. Click **New query**.
4. Open the `SUPABASE_CUSTOM_COLUMNS.sql` file in this editor (you can click on it in the file explorer), copy its entire contents, and paste it into the Supabase SQL Editor.
5. Click **Run**.

This script will:
- Safely create the missing tables (`units`, `product_categories`).
- Add the necessary `custom_attributes` JSONB column to the `products` table so your custom columns can be saved dynamically without needing `ALTER TABLE` operations.
- Create the `custom_columns` table so the UI can remember your created columns.
- Update the RLS policies for `units`, `product_categories`, `custom_columns`, and `products` to allow authenticated users to perform operations, which directly fixes the error you were facing.

Once done, you can click "Custom Columns" inside the Product Inventory UI (next to the Units and GST buttons) to add, view, and delete dynamic columns!
