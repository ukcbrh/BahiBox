echo "--- Command 1 ---"
grep -n "const fetchPlans\|fetchPlans =" src/components/payments/SubscriptionPlanManager.tsx || true
echo "--- Command 2 ---"
grep -n "fetchPlans\|initData" src/components/payments/SubscriptionPlanManager.tsx || true
echo "--- Command 3 ---"
grep -n "useEffect" src/components/payments/SubscriptionPlanManager.tsx || true
