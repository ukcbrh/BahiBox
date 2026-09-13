
CREATE OR REPLACE FUNCTION public.create_online_order(
    p_tenant_id uuid, 
    p_branch_id uuid, 
    p_user_id uuid, 
    p_customer_name text, 
    p_customer_phone text, 
    p_delivery_address text, 
    p_payment_method text, 
    p_items jsonb,
    p_latitude numeric DEFAULT NULL,
    p_longitude numeric DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE
    v_order_id UUID;
    v_total NUMERIC := 0;
    v_item JSONB;
    v_product_id UUID;
    v_quantity NUMERIC;
    v_price NUMERIC;
    v_product_name TEXT;
    v_current_stock NUMERIC;
    v_is_active BOOLEAN;
    v_product_tenant_id UUID;
BEGIN
    INSERT INTO orders (
        tenant_id,
        branch_id,
        user_id,
        merchant_id,
        customer_name,
        customer_phone,
        delivery_address,
        payment_method,
        status,
        total,
        latitude,
        longitude,
        created_at
    ) VALUES (
        p_tenant_id,
        p_branch_id,
        p_user_id,
        p_tenant_id,
        p_customer_name,
        p_customer_phone,
        p_delivery_address,
        p_payment_method,
        'New',
        0,
        p_latitude,
        p_longitude,
        now()
    ) RETURNING id INTO v_order_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::NUMERIC;
        
        SELECT product_name, selling_price, is_active, tenant_id 
         INTO v_product_name, v_price, v_is_active, v_product_tenant_id
        FROM products 
        WHERE id = v_product_id;
        
        IF NOT FOUND OR v_is_active IS NOT TRUE OR v_product_tenant_id != p_tenant_id THEN
            RAISE EXCEPTION 'Product % is inactive or does not belong to this store.', COALESCE(v_product_name, v_product_id::text);
        END IF;
        
        SELECT current_quantity 
         INTO v_current_stock
        FROM product_stock
        WHERE product_id = v_product_id AND branch_id = p_branch_id;
        
        IF NOT FOUND OR v_current_stock < v_quantity THEN
            RAISE EXCEPTION 'Sorry, % is out of stock (Requested: %, Available: %)', v_product_name, v_quantity, COALESCE(v_current_stock, 0);
        END IF;

        v_total := v_total + (v_price * v_quantity);

        INSERT INTO order_items (
            order_id,
            product_id,
            quantity,
            price
        ) VALUES (
            v_order_id,
            v_product_id,
            v_quantity,
            v_price
        );

        UPDATE product_stock 
         SET current_quantity = current_quantity - v_quantity 
         WHERE product_id = v_product_id AND branch_id = p_branch_id;
    END LOOP;

    UPDATE orders SET total = v_total WHERE id = v_order_id;

    RETURN jsonb_build_object('order_id', v_order_id, 'total', v_total, 'status', 'New');
END;
$function$;


CREATE OR REPLACE FUNCTION public.create_delivery_job(p_order_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $function$
  DECLARE
    v_order RECORD;
    v_tenant RECORD;
    v_branch RECORD;
    v_assignment_id UUID;
    v_rider RECORD;
    v_short_id TEXT;
  BEGIN
    -- Look up order
    SELECT tenant_id, branch_id, total, delivery_address, short_id, latitude, longitude INTO v_order FROM orders WHERE id = p_order_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
    
    -- v_short_id can be first 8 chars of order ID if short_id is null
    IF v_order.short_id IS NULL THEN
        v_short_id := left(p_order_id::text, 8);
    ELSE
        v_short_id := v_order.short_id;
    END IF;

    -- Look up tenant
    SELECT business_name INTO v_tenant FROM tenants WHERE id = v_order.tenant_id;
    
    -- Look up branch
    SELECT address, latitude, longitude INTO v_branch FROM branches WHERE id = v_order.branch_id;

    -- Create or update delivery_assignment
    SELECT id INTO v_assignment_id FROM delivery_assignments WHERE order_id = p_order_id;
    
    IF FOUND THEN
      UPDATE delivery_assignments SET 
        service_provider_id = NULL,
        status = 'unassigned',
        pickup_address = v_branch.address,
        pickup_lat = v_branch.latitude,
        pickup_lng = v_branch.longitude,
        drop_address = v_order.delivery_address,
        drop_lat = v_order.latitude,
        drop_lng = v_order.longitude,
        assigned_at = NULL
      WHERE id = v_assignment_id;
    ELSE
      INSERT INTO delivery_assignments (
        order_id, status, 
        pickup_address, pickup_lat, pickup_lng, 
        drop_address, drop_lat, drop_lng
      )
      VALUES (
        p_order_id, 'unassigned', 
        v_branch.address, v_branch.latitude, v_branch.longitude, 
        v_order.delivery_address, v_order.latitude, v_order.longitude
      )
      RETURNING id INTO v_assignment_id;
    END IF;

    -- Update order status to Dispatch
    UPDATE orders SET status = 'Dispatch' WHERE id = p_order_id;

    -- Loop through active online riders
    FOR v_rider IN
      SELECT user_id FROM service_providers WHERE provider_type = 'rider' AND is_online = true AND is_active = true AND user_id IS NOT NULL
    LOOP
      PERFORM enqueue_notification(
        NULL,
        v_order.branch_id,
        'in_app',
        'delivery_job_available',
        'service_provider',
        v_rider.user_id,
        v_rider.user_id::text,
        jsonb_build_object(
          'merchant_name', v_tenant.business_name,
          'order_short_id', v_short_id,
          'amount', v_order.total
        ),
        'delivery_assignment',
        v_assignment_id::text
      );
    END LOOP;
    
    RETURN v_assignment_id;
  END;
$function$;
