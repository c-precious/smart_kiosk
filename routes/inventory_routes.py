from flask import Blueprint, request, jsonify
from database.db import get_db_connection

inventory_bp = Blueprint("inventory", __name__)


@inventory_bp.route("/inventory", methods=["GET"])
def get_inventory():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT 
            inventory.id,
            inventory.shop_id,
            inventory.product_id,
            products.name AS product_name,
            products.category,
            products.price,
            inventory.quantity,
            inventory.last_updated
        FROM inventory
        JOIN products ON inventory.product_id = products.id
    """

    cursor.execute(query)
    inventory = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(inventory)


@inventory_bp.route("/inventory", methods=["POST"])
def add_inventory():
    data = request.get_json()

    shop_id = data.get("shop_id")
    product_id = data.get("product_id")
    quantity = data.get("quantity")

    if not shop_id or not product_id or quantity is None:
        return jsonify({"error": "shop_id, product_id and quantity are required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        query = """
            INSERT INTO inventory (shop_id, product_id, quantity)
            VALUES (%s, %s, %s)
        """

        cursor.execute(query, (shop_id, product_id, quantity))
        conn.commit()

        return jsonify({"message": "Inventory added successfully"}), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


@inventory_bp.route("/inventory/<int:product_id>", methods=["PUT"])
def update_inventory(product_id):
    data = request.get_json()
    quantity = data.get("quantity")

    if quantity is None:
        return jsonify({"error": "Quantity is required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        query = """
            UPDATE inventory
            SET quantity = %s
            WHERE product_id = %s
        """

        cursor.execute(query, (quantity, product_id))
        conn.commit()

        return jsonify({"message": "Inventory updated successfully"})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()