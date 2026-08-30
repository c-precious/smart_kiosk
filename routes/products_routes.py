from flask import Blueprint, request, jsonify
from database.db import get_db_connection

products_bp = Blueprint("products", __name__)


@products_bp.route("/products", methods=["GET"])
def get_products():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM products")
    products = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(products)


@products_bp.route("/products", methods=["POST"])
def add_product():
    data = request.get_json()

    shop_id = data.get("shop_id")
    name = data.get("name")
    category = data.get("category")
    price = data.get("price")

    if not shop_id or not name or not category or price is None:
        return jsonify({"error": "shop_id, name, category and price are required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        query = """
            INSERT INTO products 
            (shop_id, name, category, price)
            VALUES (%s, %s, %s, %s)
        """

        cursor.execute(query, (shop_id, name, category, price))
        conn.commit()

        product_id = cursor.lastrowid

        return jsonify({
            "message": "Product added successfully",
            "product_id": product_id
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


@products_bp.route("/products/<int:product_id>", methods=["PUT"])
def update_product(product_id):
    data = request.get_json()

    name = data.get("name")
    category = data.get("category")
    price = data.get("price")

    if not name or not category or price is None:
        return jsonify({"error": "name, category and price are required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        query = """
            UPDATE products
            SET name = %s, category = %s, price = %s
            WHERE id = %s
        """

        cursor.execute(query, (name, category, price, product_id))
        conn.commit()

        return jsonify({"message": "Product updated successfully"})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


@products_bp.route("/products/<int:product_id>", methods=["DELETE"])
def delete_product(product_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "DELETE FROM inventory WHERE product_id = %s",
            (product_id,)
        )

        cursor.execute(
            "DELETE FROM products WHERE id = %s",
            (product_id,)
        )

        conn.commit()

        return jsonify({"message": "Product deleted successfully"})

    except Exception as e:
        conn.rollback()
        return jsonify({
            "error": "Product could not be deleted. It may already be linked to sales records."
        }), 500

    finally:
        cursor.close()
        conn.close()