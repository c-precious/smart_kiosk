from flask import Blueprint, request, jsonify
from database.db import get_db_connection

customers_bp = Blueprint("customers", __name__)

@customers_bp.route("/customers", methods=["GET"])
def get_customers():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT 
            customers.id,
            customers.shop_id,
            shops.shop_name,
            customers.name,
            customers.phone,
            customers.created_at
        FROM customers
        JOIN shops ON customers.shop_id = shops.id
    """

    cursor.execute(query)
    customers = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(customers)


@customers_bp.route("/customers", methods=["POST"])
def add_customer():
    data = request.get_json()

    shop_id = data.get("shop_id")
    name = data.get("name")
    phone = data.get("phone")

    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        INSERT INTO customers (shop_id, name, phone)
        VALUES (%s, %s, %s)
    """

    cursor.execute(query, (shop_id, name, phone))
    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message": "Customer added successfully"}), 201

@customers_bp.route("/customers/<int:customer_id>", methods=["DELETE"])
def delete_customer(customer_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "DELETE FROM customers WHERE id = %s",
            (customer_id,)
        )

        conn.commit()

        return jsonify({"message": "Customer deleted successfully"})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()