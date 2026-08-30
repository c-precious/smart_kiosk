from flask import Blueprint, request, jsonify
from database.db import get_db_connection

service_bp = Blueprint("service", __name__)


@service_bp.route("/service-schedule/<int:shop_id>", methods=["GET"])
def get_service_schedule(shop_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT *
        FROM service_schedule
        WHERE shop_id = %s
        ORDER BY appointment_date DESC, appointment_time DESC
        """,
        (shop_id,)
    )

    schedule = cursor.fetchall()

    for item in schedule:
        if item["appointment_time"] is not None:
            item["appointment_time"] = str(item["appointment_time"])

    cursor.close()
    conn.close()

    return jsonify(schedule)


@service_bp.route("/service-schedule", methods=["POST"])
def add_service_schedule():
    data = request.get_json()

    shop_id = data.get("shop_id")
    customer_name = data.get("customer_name")
    service_name = data.get("service_name")
    appointment_date = data.get("appointment_date")
    appointment_time = data.get("appointment_time")
    price = data.get("price")

    if not shop_id or not customer_name or not service_name or not appointment_date or not appointment_time or not price:
        return jsonify({"error": "All schedule fields are required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO service_schedule
            (shop_id, customer_name, service_name, appointment_date, appointment_time,
             price, payment_method, payment_status, due_date)
            VALUES (%s, %s, %s, %s, %s, %s, NULL, 'pending', NULL)
            """,
            (
                shop_id,
                customer_name,
                service_name,
                appointment_date,
                appointment_time,
                price
            )
        )

        schedule_id = cursor.lastrowid

        conn.commit()

        return jsonify({
            "message": "Service schedule added successfully",
            "schedule_id": schedule_id
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


@service_bp.route("/service-payment/cash", methods=["POST"])
def record_cash_payment():
    data = request.get_json()

    schedule_id = data.get("schedule_id")
    shop_id = data.get("shop_id")
    service_name = data.get("service_name")
    customer_name = data.get("customer_name")
    amount = data.get("amount")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO service_payments
            (shop_id, service_name, customer_name, amount, payment_method)
            VALUES (%s, %s, %s, %s, 'cash')
            """,
            (shop_id, service_name, customer_name, amount)
        )

        cursor.execute(
            """
            UPDATE service_schedule
            SET payment_method = 'cash',
                payment_status = 'paid'
            WHERE id = %s
            """,
            (schedule_id,)
        )

        conn.commit()

        return jsonify({"message": "Cash payment recorded successfully"})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


@service_bp.route("/service-payment/mpesa", methods=["POST"])
def record_mpesa_payment():
    data = request.get_json()

    schedule_id = data.get("schedule_id")
    shop_id = data.get("shop_id")
    service_name = data.get("service_name")
    customer_name = data.get("customer_name")
    amount = data.get("amount")
    phone_number = data.get("phone_number")

    if not phone_number:
        return jsonify({"error": "Customer phone number is required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO service_payments
            (shop_id, service_name, customer_name, amount, payment_method)
            VALUES (%s, %s, %s, %s, 'mpesa')
            """,
            (shop_id, service_name, customer_name, amount)
        )

        cursor.execute(
            """
            UPDATE service_schedule
            SET payment_method = 'mpesa',
                payment_status = 'paid'
            WHERE id = %s
            """,
            (schedule_id,)
        )

        conn.commit()

        return jsonify({"message": "M-PESA payment recorded successfully"})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


@service_bp.route("/service-payment/debt", methods=["POST"])
def record_service_debt():
    data = request.get_json()

    schedule_id = data.get("schedule_id")
    shop_id = data.get("shop_id")
    customer_name = data.get("customer_name")
    amount = data.get("amount")
    due_date = data.get("due_date")

    if not due_date:
        return jsonify({"error": "Debt due date is required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            UPDATE service_schedule
            SET payment_method = 'debt',
                payment_status = 'pending',
                due_date = %s
            WHERE id = %s
            """,
            (due_date, schedule_id)
        )

        cursor.execute(
            """
            INSERT INTO debts
            (shop_id, customer_name, amount, due_date, status)
            VALUES (%s, %s, %s, %s, 'unpaid')
            """,
            (shop_id, customer_name, amount, due_date)
        )

        conn.commit()

        return jsonify({"message": "Debt recorded successfully"})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


@service_bp.route("/service-payments/<int:shop_id>", methods=["GET"])
def get_service_payments(shop_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT *
        FROM service_payments
        WHERE shop_id = %s
        ORDER BY payment_date DESC
        """,
        (shop_id,)
    )

    payments = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(payments)