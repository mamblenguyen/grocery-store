#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Cài đặt MỘT LẦN cho CI/CD Vercel. Chạy lại nhiều lần vẫn an toàn (idempotent).
#
# Script sẽ:
#   1. Tạo/liên kết 2 project Vercel: API (NestJS) và Web (Next.js)
#   2. Cấu hình project (Node 22, framework, tắt Deployment Protection cho API)
#   3. Ghi biến môi trường lên Vercel (JWT_SECRET, CORS_ORIGIN, NEXT_PUBLIC_API_URL, tài khoản admin...)
#   4. (Tuỳ chọn) ghi DATABASE_URL nếu bạn tự tạo DB, không qua Vercel Marketplace
#   5. Ghi GitHub Secrets & Variables để workflow .github/workflows/ci-cd.yml chạy được
#
# Yêu cầu: vercel CLI, gh CLI (đã `gh auth login`), jq, openssl, curl
#
# Dùng:
#   export VERCEL_TOKEN=xxxxx               # tạo tại https://vercel.com/account/tokens
#   export VERCEL_SCOPE=my-team             # (tuỳ chọn) slug team, bỏ trống = tài khoản cá nhân
#   export DATABASE_URL="mysql://USER:PASS@HOST:3306/grocery?sslaccept=strict"   # MySQL online cho production
#   ./scripts/vercel-setup.sh
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

API_PROJECT="${API_PROJECT:-grocery-store-api}"
WEB_PROJECT="${WEB_PROJECT:-grocery-store-web}"
REPO="${GITHUB_REPO:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

: "${VERCEL_TOKEN:?Hãy export VERCEL_TOKEN (tạo tại https://vercel.com/account/tokens)}"
for bin in vercel gh jq openssl curl; do command -v "$bin" >/dev/null || { echo "Thiếu lệnh: $bin"; exit 1; }; done

SCOPE_FLAG=()
[ -n "${VERCEL_SCOPE:-}" ] && SCOPE_FLAG=(--scope "$VERCEL_SCOPE")

say() { printf '\n\033[1;32m▶ %s\033[0m\n' "$*"; }

# ── 1. Tạo / liên kết project ────────────────────────────────────────────────
link_project() { # $1=thư mục  $2=tên project
  (cd "$ROOT/$1" && vercel link --yes --project "$2" --token "$VERCEL_TOKEN" "${SCOPE_FLAG[@]}" >/dev/null)
  jq -r '.orgId + " " + .projectId' "$ROOT/$1/.vercel/project.json"
}
say "Liên kết project Vercel"
read -r ORG_ID API_ID < <(link_project backend "$API_PROJECT")
read -r _ WEB_ID < <(link_project frontend "$WEB_PROJECT")
[ -n "${API_ID:-}" ] && [ -n "${WEB_ID:-}" ] || { echo "Không liên kết được project Vercel"; exit 1; }
echo "  org=$ORG_ID  api=$API_ID  web=$WEB_ID"

TEAM_QS=""
[[ "$ORG_ID" == team_* ]] && TEAM_QS="teamId=$ORG_ID"

vapi() { # $1=METHOD $2=path $3=json body (tuỳ chọn)
  local url="https://api.vercel.com$2"
  if [ -n "$TEAM_QS" ]; then
    if [[ "$url" == *\?* ]]; then url="$url&$TEAM_QS"; else url="$url?$TEAM_QS"; fi
  fi
  local args=(-fsS -X "$1" -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json")
  [ -n "${3:-}" ] && args+=(-d "$3")
  curl "${args[@]}" "$url"
}

# ── 2. Cấu hình project ──────────────────────────────────────────────────────
say "Cấu hình project"
# API: không framework, Node 22, tắt Vercel Authentication để frontend (preview & production) gọi được API
vapi PATCH "/v9/projects/$API_ID" '{"framework":null,"nodeVersion":"22.x","ssoProtection":null}' >/dev/null
vapi PATCH "/v9/projects/$WEB_ID" '{"framework":"nextjs","nodeVersion":"22.x"}' >/dev/null

domain_of() { # domain production mặc định *.vercel.app của project
  local d
  d=$(vapi GET "/v9/projects/$1/domains" | jq -r '[.domains[].name | select(endswith(".vercel.app"))][0] // empty' 2>/dev/null || true)
  echo "${d:-$2.vercel.app}"
}
API_URL="${API_URL:-https://$(domain_of "$API_ID" "$API_PROJECT")}"
WEB_URL="${WEB_URL:-https://$(domain_of "$WEB_ID" "$WEB_PROJECT")}"
echo "  API_URL=$API_URL"
echo "  WEB_URL=$WEB_URL"

# ── 3. Biến môi trường trên Vercel ───────────────────────────────────────────
set_env() { # $1=projectId $2=KEY $3=VALUE $4=targets(json array)
  vapi POST "/v10/projects/$1/env?upsert=true" \
    "$(jq -n --arg k "$2" --arg v "$3" --argjson t "$4" '{key:$k,value:$v,type:"encrypted",target:$t}')" >/dev/null
  echo "  ✔ $2"
}
has_env() { vapi GET "/v9/projects/$1/env" | jq -e --arg k "$2" '.envs[] | select(.key==$k)' >/dev/null; }
ALL='["production","preview","development"]'

say "Biến môi trường – API"
has_env "$API_ID" JWT_SECRET || set_env "$API_ID" JWT_SECRET "$(openssl rand -hex 32)" "$ALL"
set_env "$API_ID" JWT_EXPIRES_IN "7d" "$ALL"
WEB_HOST="${WEB_URL#https://}"
set_env "$API_ID" CORS_ORIGIN "$WEB_URL,https://${WEB_HOST%%.vercel.app}-*.vercel.app,http://localhost:3000" "$ALL"
set_env "$API_ID" SHIPPING_FEE "20000" "$ALL"
set_env "$API_ID" FREE_SHIPPING_THRESHOLD "300000" "$ALL"

ADMIN_EMAIL="${SEED_ADMIN_EMAIL:-admin@grocery.local}"
NEW_ADMIN_PASSWORD=""
if ! has_env "$API_ID" SEED_ADMIN_PASSWORD; then
  NEW_ADMIN_PASSWORD="${SEED_ADMIN_PASSWORD:-$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-16)}"
  set_env "$API_ID" SEED_ADMIN_EMAIL "$ADMIN_EMAIL" '["production","preview"]'
  set_env "$API_ID" SEED_ADMIN_PASSWORD "$NEW_ADMIN_PASSWORD" '["production","preview"]'
fi

if [ -n "${DATABASE_URL:-}" ]; then
  set_env "$API_ID" DATABASE_URL "$DATABASE_URL" '["production","preview"]'
fi

say "Biến môi trường – Web"
set_env "$WEB_ID" NEXT_PUBLIC_API_URL "$API_URL/api" "$ALL"

# ── 4. GitHub secrets & variables ────────────────────────────────────────────
say "GitHub secrets/variables cho $REPO"
gh secret set VERCEL_TOKEN --repo "$REPO" --body "$VERCEL_TOKEN"
gh secret set VERCEL_ORG_ID --repo "$REPO" --body "$ORG_ID"
gh secret set VERCEL_PROJECT_ID_API --repo "$REPO" --body "$API_ID"
gh secret set VERCEL_PROJECT_ID_WEB --repo "$REPO" --body "$WEB_ID"
gh variable set API_URL --repo "$REPO" --body "$API_URL"
gh variable set WEB_URL --repo "$REPO" --body "$WEB_URL"

# ── 5. Kiểm tra database ─────────────────────────────────────────────────────
say "Kiểm tra database"
if has_env "$API_ID" DATABASE_URL; then
  echo "  ✔ Project API đã có DATABASE_URL"
  DB_READY=1
else
  DB_READY=0
  cat <<EOF
  ⚠ Project API CHƯA có database. Tạo MySQL online (vd TiDB Cloud Serverless, Aiven, Railway)
     rồi chạy lại:  DATABASE_URL="mysql://..." ./scripts/vercel-setup.sh
EOF
fi
has_env "$API_ID" BLOB_READ_WRITE_TOKEN && echo "  ✔ Đã có Vercel Blob (upload ảnh)" || cat <<EOF
  ⚠ (Nên có) Lưu ảnh upload: project "$API_PROJECT" → Storage → Create → Blob → Connect.
     Nếu không có Blob, upload ảnh trên Vercel sẽ lỗi vì serverless không có ổ đĩa lâu dài.
EOF

say "Hoàn tất"
cat <<EOF
  Cửa hàng : $WEB_URL
  Quản trị : $WEB_URL/admin
  API      : $API_URL/api/health
EOF
[ -n "$NEW_ADMIN_PASSWORD" ] && cat <<EOF

  🔑 Tài khoản admin production (được tạo ở lần deploy đầu tiên, LƯU LẠI NGAY):
     Email   : $ADMIN_EMAIL
     Mật khẩu: $NEW_ADMIN_PASSWORD
EOF
[ "$DB_READY" = 1 ] && echo -e "\n  ➜ Push lên main (hoặc Actions → CI/CD → Run workflow) để deploy." || true
