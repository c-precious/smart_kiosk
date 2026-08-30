from flask import Blueprint, request, jsonify
from database.db import get_db_connection

debts_bp = Blueprint("debts", __name__)


@debts_bp.route("/debts/<int:shop_id>", methods=["GET"])
def get_shop_debts(shop_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT 
            debts.id,
            debts.shop_id,
            debts.customer_id,
            debts.customer_name,
            debts.amount,
            debts.amount AS original_amount,
            IFNULL(SUM(payments.amount_paid), 0) AS total_paid,
            (debts.amount - IFNULL(SUM(payments.amount_paid), 0)) AS balance,
            debts.due_date,
            debts.status,
            debts.created_at
        FROM debts
        LEFT JOIN payments 
            ON debts.id = payments.debt_id
        WHERE debts.shop_id = %s
        GROUP BY debts.id
        ORDER BY debts.created_at DESC
    """

    cursor.execute(query, (shop_id,))
    debts = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(debts)


@debts_bp.route("/debts", methods=["GET"])
def get_debts():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT 
            debts.id,
            debts.shop_id,
            debts.customer_id,
            debts.customer_name,
            debts.amount,
            debts.amount AS original_amount,
            IFNULL(SUM(payments.amount_paid), 0) AS total_paid,
            (debts.amount - IFNULL(SUM(payments.amount_paid), 0)) AS balance,
            debts.due_date,
            debts.status,
            debts.created_at
        FROM debts
        LEFT JOIN payments 
            ON debts.id = payments.debt_id
        GROUP BY debts.id
        ORDER BY debts.created_at DESC
    """

    cursor.execute(query)
    debts = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(debts)


@debts_bp.route("/debts", methods=["POST"])
def add_debt():
    data = request.get_json()

    shop_id = data.get("shop_id")
    customer_id = data.get("customer_id")
    customer_name = data.get("customer_name")
    amount = data.get("amount")
    due_date = data.get("due_date")

    if not shop_id or not customer_name or not amount or not due_date:
        return jsonify({"error": "Shop, customer name, amount and due date are required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO debts
            (shop_id, customer_id, customer_name, amount, due_date, status)
            VALUES (%s, %s, %s, %s, %s, 'unpaid')
            """,
            (shop_id, customer_id, customer_name, amount, due_date)
        )

        conn.commit()

        return jsonify({"message": "Debt added successfully"}), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


@debts_bp.route("/debts/<int:debt_id>/pay", methods=["POST"])
def pay_debt(debt_id):
    data = request.get_json()

    amount_paid = data.get("amount_paid")
    business_type = data.get("business_type")

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT *
            FROM debts
            WHERE id = %s
            """,
            (debt_id,)
        )

        debt = cursor.fetchone()

        if not debt:
            return jsonify({"error": "Debt not found"}), 404

        cursor.execute(
            """
            INSERT INTO payments (debt_id, amount_paid)
            VALUES (%s, %s)
            """,
            (debt_id, amount_paid)
        )

        if business_type == "service":
            cursor.execute(
                """
                INSERT INTO service_payments
                (shop_id, service_name, customer_name, amount, payment_method)
                VALUES (%s, %s, %s, %s, 'debt-paid')
                """,
                (
                    debt["shop_id"],
                    "Debt Payment",
                    debt["customer_name"],
                    amount_paid
                )
            )

        cursor.execute(
            """
            SELECT SUM(amount_paid) AS total_paid
            FROM payments
            WHERE debt_id = %s
            """,
            (debt_id,)
        )

        payment_result = cursor.fetchone()
        total_paid = payment_result["total_paid"] or 0

        if float(total_paid) >= float(debt["amount"]):
            cursor.execute(
                """
                UPDATE debts
                SET status = 'paid'
                WHERE id = %s
                """,
                (debt_id,)
            )

        conn.commit()

        return jsonify({
            "message": "Payment recorded successfully",
            "total_paid": float(total_paid)
        })

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


@debts_bp.route("/debts/<int:debt_id>", methods=["PUT"])
def update_debt(debt_id):
    data = request.get_json()

    amount = data.get("amount")
    due_date = data.get("due_date")
    status = data.get("status")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            UPDATE debts
            SET amount = %s, due_date = %s, status = %s
            WHERE id = %s
            """,
            (amount, due_date, status, debt_id)
        )

        conn.commit()

        return jsonify({"message": "Debt updated successfully"})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


@debts_bp.route("/debts/<int:debt_id>", methods=["DELETE"])
def delete_debt(debt_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "DELETE FROM debts WHERE id = %s",
            (debt_id,)
        )

        conn.commit()

        return jsonify({"message": "Debt deleted successfully"})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()