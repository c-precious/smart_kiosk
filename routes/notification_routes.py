from flask import Blueprint, jsonify
from database.db import get_db_connection

notifications_bp = Blueprint("notifications", __name__)


@notifications_bp.route("/notifications", methods=["GET"])
def get_notifications():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    notifications = []

    # 1. Overdue debts
    cursor.execute("""
        SELECT 
            id AS debt_id,
            shop_id,
            customer_name,
            customer_phone,
            amount,
            due_date,
            status
        FROM debts
        WHERE due_date < CURDATE()
        AND status != 'paid'
    """)

    overdue_debts = cursor.fetchall()

    for debt in overdue_debts:
        notifications.append({
            "shop_id": debt["shop_id"],
            "title": "Overdue Debt",
            "type": "overdue",
            "message": f"{debt['customer_name']} has an overdue balance of Ksh {debt['amount']}",
            "details": debt
        })

    # 2. Debts due soon
    cursor.execute("""
        SELECT 
            id AS debt_id,
            shop_id,
            customer_name,
            customer_phone,
            amount,
            due_date,
            status
        FROM debts
        WHERE due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)
        AND status != 'paid'
    """)

    due_soon_debts = cursor.fetchall()

    for debt in due_soon_debts:
        notifications.append({
            "shop_id": debt["shop_id"],
            "title": "Debt Due Soon",
            "type": "due_soon",
            "message": f"{debt['customer_name']}'s debt of Ksh {debt['amount']} is due soon",
            "details": debt
        })

    # 3. Low stock alerts
    cursor.execute("""
        SELECT 
            inventory.shop_id,
            products.name AS product_name,
            inventory.quantity
        FROM inventory
        JOIN products ON inventory.product_id = products.id
        WHERE inventory.quantity <= 20
    """)

    low_stock_items = cursor.fetchall()

    for item in low_stock_items:
        notifications.append({
            "shop_id": item["shop_id"],
            "title": "Low Stock",
            "type": "low_stock",
            "message": f"{item['product_name']} stock is low. Remaining quantity: {item['quantity']}",
            "details": item
        })

    cursor.close()
    conn.close()

    return jsonify(notifications)