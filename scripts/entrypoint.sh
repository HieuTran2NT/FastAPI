
#!/usr/bin/env sh
set -e
echo "Waiting for PostgreSQL..."
echo "Waiting for PostgreSQL..."
echo "Waiting for PostgreSQL..."
python - <<'PY'
import os, time, psycopg2
from urllib.parse import urlparse

url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@db:5432/todos_db')
parsed = urlparse(url)
max_tries = 30
for i in range(max_tries):
    try:
        conn = psycopg2.connect(
            dbname=parsed.path.lstrip('/'),
            user=parsed.username,
            password=parsed.password,
            host=parsed.hostname,
            port=parsed.port or 5432,
        )
        conn.close()
        print("PostgreSQL is ready.")
        break
    except Exception as e:
        print(f"DB not ready yet ({e}), retry {i+1}/{max_tries}...")
        time.sleep(2)
else:
    raise SystemExit("Database not available")
PY

echo "Running Alembic migrations..."
alembic upgrade head

echo "Starting Uvicorn..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
