import os
import time
from flask import Flask, request, jsonify
import psycopg2
import requests

app = Flask(__name__)

# ✅ Database connection with retry logic
conn = None
for attempt in range(10):
    try:
        conn = psycopg2.connect(
            host=os.environ.get("PGHOST", "localhost"),
            port=os.environ.get("PGPORT", "5432"),
            database=os.environ.get("PGDATABASE", "emartdb"),
            user=os.environ.get("PGUSER", "emartuser"),
            password=os.environ.get("PGPASSWORD", "emartpass")
        )
        print("✅ Connected to Postgres")
        break
    except psycopg2.OperationalError as e:
        print(f"⏳ Attempt {attempt+1}/10: Waiting for Postgres...", e)
        time.sleep(3)
else:
    raise Exception("❌ Could not connect to Postgres after 10 attempts")

# ✅ Create users table and seed it
cursor = conn.cursor()
cursor.execute("""
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    password VARCHAR(100),
    kyc_approved BOOLEAN DEFAULT FALSE,
    balance NUMERIC DEFAULT 0.0
)
""")
cursor.execute("SELECT COUNT(*) FROM users")
if cursor.fetchone()[0] == 0:
    cursor.execute("""
    INSERT INTO users (id, name, email, password, kyc_approved, balance) VALUES
    ('u1', 'Alice', 'alice@example.com', 'pass123', TRUE, 50000),
    ('u2', 'Bob', 'bob@example.com', 'pass123', FALSE, 20000),
    ('u3', 'Charlie', 'charlie@example.com', 'pass123', TRUE, 8000)
    """)
    conn.commit()
    print("🧑‍💻 Default users seeded")
cursor.close()

# ✅ User Login Route
@app.route("/validateuser", methods=["POST"])
def validate_user():
    data = request.json
    user_id = data.get("user_id")
    password = data.get("password")

    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = %s AND password = %s", (user_id, password))
    user = cursor.fetchone()
    cursor.close()

    print("🔐 VALIDATE:", user_id, password, "FOUND" if user else "NOT FOUND")

    if user:
        return jsonify({"status": "success", "user": user_id})
    else:
        return jsonify({"status": "failed"}), 401

# ✅ Compliance check fetch: Get KYC and balance
@app.route("/userdetails/<user_id>", methods=["GET"])
def get_user_details(user_id):
    cursor = conn.cursor()
    cursor.execute("SELECT kyc_approved, balance FROM users WHERE id = %s", (user_id,))
    result = cursor.fetchone()
    cursor.close()

    if result:
        kyc, balance = result
        return jsonify({
            "user_id": user_id,
            "kyc_approved": kyc,
            "balance": float(balance)
        })
    else:
        return jsonify({"error": "User not found"}), 404

# ✅ Submit Order Route with retry logic for Java Ledger
@app.route("/submitorder", methods=["POST"])
def submit_order():
    data = request.json
    user_id = data.get("user_id")
    items = data.get("items", [])
    total_amount = data.get("total", 0.0)

    if not user_id or not items:
        return jsonify({"status": "failed", "message": "Missing user_id or items"}), 400

    LEDGER_URL = os.environ.get("LEDGER_URL", "http://ledger-service-java:8080")
    success_count = 0

    for item in items:
        payload = {
            "user_id": user_id,
            "product_id": str(item.get("product_id")),
            "name": item.get("name"),
            "quantity": item.get("quantity", 1),
            "price": item.get("price", 0.0),
            "total_amount": total_amount
        }

        for attempt in range(3):
            try:
                response = requests.post(f"{LEDGER_URL}/record", json=payload, timeout=5)
                if response.ok:
                    print(f"📤 Item sent to Ledger (attempt {attempt+1}):", payload)
                    success_count += 1
                    break
                else:
                    print(f"⚠️ Ledger response error (attempt {attempt+1}): {response.status_code}")
            except Exception as e:
                print(f"❌ Ledger request failed (attempt {attempt+1}):", str(e))
            time.sleep(2 ** attempt)  # 1s, 2s, 4s backoff

    return jsonify({
        "status": "success" if success_count == len(items) else "partial",
        "message": f"{success_count}/{len(items)} items recorded"
    }), 200 if success_count > 0 else 500

# ✅ Start Flask
if __name__ == "__main__":
    print("🚀 Starting Flask on port 5002")
    app.run(host="0.0.0.0", port=5002)
