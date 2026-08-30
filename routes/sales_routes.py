from flask import Blueprint, request, jsonify
from database.db import get_db_connection
from datetime import datetime, timedelta

sales_bp = Blueprint("sales", __name__)


def log_activity(cursor, user_id, shop_id, action):
    if user_id:
        cursor.execute(
            """
            INSERT INTO activity_logs (user_id, shop_id, action)
            VALUES (%s, %s, %s)
            """,
            (user_id, shop_id, action)
        )


@sales_bp.route("/sales", methods=["GET"])
def get_sales():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT 
            sales.id,
            sales.shop_id,
            shops.shop_name,
            products.name AS product_name,
            sale_items.quantity,
            sale_items.price,
            sales.total_amount,
            sales.payment_method,
            sales.customer_name,
            sales.phone,
            sales.sale_date
        FROM sales
        JOIN shops ON sales.shop_id = shops.id
        JOIN sale_items ON sales.id = sale_items.sale_id
        JOIN products ON sale_items.product_id = products.id
        ORDER BY sales.sale_date DESC
    """

    cursor.execute(query)
    sales = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(sales)


@sales_bp.route("/sales", methods=["POST"])
def add_sale():
    data = request.get_json()

    user_id = data.get("user_id")
    shop_id = data.get("shop_id")
    items = data.get("items")
    payment_method = data.get("payment_method")
    customer_name = data.get("customer_name")
    phone = data.get("phone")
    due_date = data.get("due_date")

    if not shop_id or not items:
        return jsonify({"error": "shop_id and items are required"}), 400

    if not payment_method:
        return jsonify({"error": "Payment method is required"}), 400

    if payment_method == "Debt" and (not customer_name or not phone or not due_date):
        return jsonify({"error": "Customer name, phone and due date are required for debt sales"}), 400

    if payment_method == "Mpesa" and not phone:
        return jsonify({"error": "Phone number is required for M-Pesa sales"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        total_amount = 0

        for item in items:
            product_id = item.get("product_id")
            quantity = item.get("quantity")

            if not product_id or not quantity:
                return jsonify({"error": "Each item must have product_id and quantity"}), 400

            quantity = int(quantity)

            cursor.execute(
                """
                SELECT id, price 
                FROM products 
                WHERE id = %s AND shop_id = %s
                """,
                (product_id, shop_id)
            )

            product = cursor.fetchone()

            if not product:
                return jsonify({
                    "error": f"Product ID {product_id} does not exist in this shop"
                }), 400

            cursor.execute(
                """
                SELECT quantity 
                FROM inventory 
                WHERE product_id = %s AND shop_id = %s
                """,
                (product_id, shop_id)
            )

            stock = cursor.fetchone()

            if not stock:
                return jsonify({
                    "error": f"Product ID {product_id} is not in inventory"
                }), 400

            if stock["quantity"] < quantity:
                return jsonify({"error": "Not enough stock available"}), 400

            total_amount += float(product["price"]) * quantity

        kenya_time = datetime.utcnow() + timedelta(hours=3)

        cursor.execute(
            """
            INSERT INTO sales 
            (shop_id, total_amount, payment_method, customer_name, phone, sale_date)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (shop_id, total_amount, payment_method, customer_name, phone, kenya_time)
        )

        sale_id = cursor.lastrowid

        total_quantity = 0

        for item in items:
            product_id = item.get("product_id")
            quantity = int(item.get("quantity"))
            total_quantity += quantity

            cursor.execute(
                """
                SELECT price 
                FROM products 
                WHERE id = %s AND shop_id = %s
                """,
                (product_id, shop_id)
            )

            product = cursor.fetchone()
            price = product["price"]

            cursor.execute(
                """
                INSERT INTO sale_items 
                (sale_id, product_id, quantity, price)
                VALUES (%s, %s, %s, %s)
                """,
                (sale_id, product_id, quantity, price)
            )

            cursor.execute(
                """
                UPDATE inventory
                SET quantity = quantity - %s
                WHERE product_id = %s AND shop_id = %s
                """,
                (quantity, product_id, shop_id)
            )

        if payment_method == "Debt":

            cursor.execute(
                """
                SELECT id FROM customers
                WHERE phone = %s AND shop_id = %s
                """,
                (phone, shop_id)
            )

            customer = cursor.fetchone()

            if customer:
                customer_id = customer["id"]
            else:
                cursor.execute(
                    """
                    INSERT INTO customers (shop_id, name, phone)
                    VALUES (%s, %s, %s)
                    """,
                    (shop_id, customer_name, phone)
                )

                customer_id = cursor.lastrowid

            cursor.execute(
                """
                INSERT INTO debts
                (shop_id, customer_id, customer_name, customer_phone, amount, due_date, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (shop_id, customer_id, customer_name, phone, total_amount, due_date, "unpaid")
            )

        log_activity(
            cursor,
            user_id,
            shop_id,
            f"Recorded {payment_method} sale worth Ksh {total_amount} with {total_quantity} item(s)"
        )

        conn.commit()

        return jsonify({
            "message": "Sale recorded successfully",
            "sale_id": sale_id,
            "total_amount": total_amount,
            "payment_method": payment_method,
            "customer_name": customer_name,
            "phone": phone,
            "due_date": due_date,
            "sale_date": kenya_time.strftime("%Y-%m-%d %H:%M:%S")
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


@sales_bp.route("/sales/<int:sale_id>/cancel", methods=["PUT"])
def cancel_sale(sale_id):
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT id, shop_id, total_amount
            FROM sales
            WHERE id = %s
        """, (sale_id,))

        sale = cursor.fetchone()

        if not sale:
            return jsonify({"error": "Sale not found"}), 404

        cursor.execute("""
            SELECT product_id, quantity
            FROM sale_items
            WHERE sale_id = %s
        """, (sale_id,))

        items = cursor.fetchall()

        for item in items:
            cursor.execute("""
                UPDATE inventory
                SET quantity = quantity + %s
                WHERE product_id = %s
            """, (item["quantity"], item["product_id"]))

        cursor.execute("""
            DELETE FROM debts
            WHERE id IN (
                SELECT id FROM (
                    SELECT debts.id
                    FROM debts
                    JOIN sales ON debts.shop_id = sales.shop_id
                    WHERE sales.id = %s
                    AND debts.amount = sales.total_amount
                ) AS temp
            )
        """, (sale_id,))

        cursor.execute("DELETE FROM sale_items WHERE sale_id = %s", (sale_id,))
        cursor.execute("DELETE FROM sales WHERE id = %s", (sale_id,))

        log_activity(
            cursor,
            user_id,
            sale["shop_id"],
            f"Cancelled sale #{sale_id} worth Ksh {sale['total_amount']}"
        )

        conn.commit()

        return jsonify({"message": "Sale cancelled successfully"})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()