from flask import Blueprint, request, jsonify
from database.db import get_db_connection

shops_bp = Blueprint("shops", __name__)


@shops_bp.route("/shops/<int:user_id>", methods=["GET"])
def get_user_shops(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT id, name, email, phone, role, assigned_shop_id
        FROM users
        WHERE id = %s
        """,
        (user_id,)
    )

    user = cursor.fetchone()

    if not user:
        cursor.close()
        conn.close()
        return jsonify({"error": "User not found"}), 404

    if user["role"] == "worker":
        cursor.execute(
            """
            SELECT *
            FROM shops
            WHERE id = %s
            """,
            (user["assigned_shop_id"],)
        )
    else:
        cursor.execute(
            """
            SELECT *
            FROM shops
            WHERE user_id = %s
            """,
            (user_id,)
        )

    shops = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(shops)


@shops_bp.route("/shops", methods=["POST"])
def add_shop():
    data = request.get_json()

    user_id = data.get("user_id")
    shop_name = data.get("shop_name")
    location = data.get("location")
    business_type = data.get("business_type", "product")
    service_category = data.get("service_category")

    if not user_id or not shop_name:
        return jsonify({"error": "User ID and shop name are required"}), 400

    if business_type == "product":
        service_category = None

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT role
            FROM users
            WHERE id = %s
            """,
            (user_id,)
        )

        user = cursor.fetchone()

        if user and user["role"] == "worker":
            return jsonify({"error": "Workers cannot add shops"}), 403

        cursor.execute(
            """
            INSERT INTO shops 
            (user_id, shop_name, location, business_type, service_category)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (user_id, shop_name, location, business_type, service_category)
        )

        conn.commit()

        return jsonify({"message": "Shop added successfully"}), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


@shops_bp.route("/shops/<int:shop_id>", methods=["PUT"])
def update_shop(shop_id):
    data = request.get_json()

    shop_name = data.get("shop_name")
    location = data.get("location")
    business_type = data.get("business_type", "product")
    service_category = data.get("service_category")

    if not shop_name:
        return jsonify({"error": "Shop name is required"}), 400

    if business_type == "product":
        service_category = None

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            UPDATE shops
            SET shop_name = %s, 
                location = %s,
                business_type = %s,
                service_category = %s
            WHERE id = %s
            """,
            (shop_name, location, business_type, service_category, shop_id)
        )

        conn.commit()

        return jsonify({"message": "Shop updated successfully"})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


@shops_bp.route("/shops/<int:shop_id>", methods=["DELETE"])
def delete_shop(shop_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("DELETE FROM shops WHERE id = %s", (shop_id,))
        conn.commit()

        return jsonify({"message": "Shop deleted successfully"})

    except Exception:
        conn.rollback()

        return jsonify({
            "error": "Shop could not be deleted because it already has linked records."
        }), 400

    finally:
        cursor.close()
        conn.close()