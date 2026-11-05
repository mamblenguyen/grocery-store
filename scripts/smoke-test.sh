#!/usr/bin/env bash
# Kiểm tra nhanh API sau khi deploy.
# Dùng: scripts/smoke-test.sh <BASE_URL> [--full]
#   --full: đăng nhập tài khoản demo, tính tiền giỏ hàng, đặt đơn, admin xác nhận (chỉ dùng với DB test/CI)
set -euo pipefail
BASE="${1:?Thiếu BASE_URL, vd: https://grocery-store-api.vercel.app}"
FULL="${2:-}"
API="${BASE%/}/api"
fail() { echo "❌ $*" >&2; exit 1; }
json() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const d=JSON.parse(s);console.log(eval(process.argv[1]))})" "$1"; }

echo "→ Chờ $API/health ..."
for i in $(seq 1 20); do
  if body=$(curl -fsS --max-time 15 "$API/health" 2>/dev/null); then echo "   $body"; break; fi
  [ "$i" = 20 ] && fail "API không phản hồi"
  sleep 5
done

n=$(curl -fsS "$API/stores" | json 'd.total')
echo "✔ /stores: $n cửa hàng đang hoạt động"

if [ "$FULL" = "--full" ]; then
  login() { curl -fsS -X POST "$API/auth/login" -H 'content-type: application/json' -d "{\"email\":\"$1\",\"password\":\"123456\"}" | json 'd.accessToken'; }
  T=$(login customer@grocery.local); A=$(login admin@grocery.local); A2=$(login owner2@grocery.local)
  ST='X-Store: tap-hoa-xanh'
  n=$(curl -fsS "$API/products?limit=5" -H "$ST" | json 'd.total'); echo "✔ /products: $n sản phẩm"
  V=$(curl -fsS "$API/products?inStock=true&limit=1" -H "$ST" | json 'd.items[0].variants.find(v=>v.stock>0).id')
  total=$(curl -fsS -X POST "$API/orders/preview" -H "$ST" -H 'content-type: application/json' -d "{\"items\":[{\"variantId\":$V,\"quantity\":1}]}" | json 'd.total')
  echo "✔ preview đơn hàng: $total"
  OID=$(curl -fsS -X POST "$API/orders" -H "$ST" -H "authorization: Bearer $T" -H 'content-type: application/json' \
    -d "{\"items\":[{\"variantId\":$V,\"quantity\":1}],\"customerName\":\"CI Test\",\"phone\":\"0901234567\",\"address\":\"123 CI Street\"}" | json 'd.id')
  echo "✔ đặt đơn #$OID"
  st=$(curl -fsS -X PATCH "$API/admin/orders/$OID/status" -H "authorization: Bearer $A" -H 'content-type: application/json' -d '{"status":"CONFIRMED"}' | json 'd.status')
  [ "$st" = "CONFIRMED" ] || fail "Không xác nhận được đơn"
  echo "✔ admin xác nhận đơn"
  code=$(curl -s -o /dev/null -w '%{http_code}' "$API/admin/dashboard" -H "authorization: Bearer $T")
  [ "$code" = "403" ] || fail "Khách hàng truy cập được trang admin (HTTP $code)"
  echo "✔ phân quyền admin"
  code=$(curl -s -o /dev/null -w '%{http_code}' "$API/admin/orders/$OID" -H "authorization: Bearer $A2")
  [ "$code" = "404" ] || fail "Cửa hàng khác xem được đơn (HTTP $code)"
  echo "✔ cách ly dữ liệu giữa các cửa hàng"
fi
echo "✅ Smoke test OK: $BASE"
