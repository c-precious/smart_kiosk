from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
from database.db import get_db_connection

workers_bp = Blueprint("workers", __name__)


@workers_bp.route("/workers/<int:owner_id>", methods=["GET"])
def get_workers(owner_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT 
            users.id,
            users.name,
            users.email,
            users.phone,
            users.role,
            users.assigned_shop_id,
            shops.shop_name
        FROM users
        LEFT JOIN shops ON users.assigned_shop_id = shops.id
        WHERE users.role = 'worker'
        AND shops.user_id = %s
        ORDER BY users.created_at DESC
    """, (owner_id,))

    workers = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(workers)


@workers_bp.route("/workers", methods=["POST"])
def add_worker():
    data = request.get_json()

    owner_id = data.get("owner_id")
    name = data.get("name")
    email = data.get("email")
    phone = data.get("phone")
    password = data.get("password")
    assigned_shop_id = data.get("assigned_shop_id")

    if not owner_id or not name or not email or not password or not assigned_shop_id:
        return jsonify({"error": "Owner, name, email, password and assigned shop are required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT id
            FROM shops
            WHERE id = %s AND user_id = %s
        """, (assigned_shop_id, owner_id))

        shop = cursor.fetchone()

        if not shop:
            return jsonify({"error": "Selected shop does not belong to this owner"}), 403

        hashed_password = generate_password_hash(password)

        cursor.execute("""
            INSERT INTO users
            (name, email, phone, password, role, assigned_shop_id)
            VALUES (%s, %s, %s, %s, 'worker', %s)
        """, (name, email, phone, hashed_password, assigned_shop_id))

        conn.commit()

        return jsonify({"message": "Worker added successfully"}), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


@workers_bp.route("/workers/<int:worker_id>", methods=["DELETE"])
def delete_worker(worker_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            DELETE FROM users
            WHERE id = %s AND role = 'worker'
        """, (worker_id,))

        conn.commit()

        return jsonify({"message": "Worker removed successfully"})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()