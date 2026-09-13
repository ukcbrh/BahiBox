DO $$
DECLARE
  func_def text;
BEGIN
  -- 1. Get the current definition of create_pos_sale
  SELECT pg_get_functiondef(p.oid)
  INTO func_def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' 
    AND p.proname = 'create_pos_sale'
  LIMIT 1;
  
  IF func_def IS NULL THEN
    RAISE NOTICE 'Function create_pos_sale not found.';
    RETURN;
  END IF;

  -- 2. Check if it already has explicit casts to ::gst_type
  IF func_def LIKE '%''cgst_sgst''::gst_type%' THEN
    RAISE NOTICE 'Function already has gst_type casts.';
    RETURN;
  END IF;

  -- 3. Replace the text literals with explicit casts to ::gst_type
  func_def := replace(func_def, 
                      '''cgst_sgst'' ELSE ''igst'' END', 
                      '''cgst_sgst''::gst_type ELSE ''igst''::gst_type END');
                      
  func_def := replace(func_def, 
                      '''cgst_sgst''', 
                      '''cgst_sgst''::gst_type');

  func_def := replace(func_def, 
                      '''igst''', 
                      '''igst''::gst_type');
                      
  -- Just in case replacing multiple times double-casts it, we can clean up:
  func_def := replace(func_def, '::gst_type::gst_type', '::gst_type');

  -- 4. Re-run the CREATE OR REPLACE FUNCTION command
  EXECUTE func_def;
  
  RAISE NOTICE 'Function create_pos_sale patched successfully!';
END
$$;
