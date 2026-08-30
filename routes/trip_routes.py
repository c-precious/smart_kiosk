from flask import Blueprint, request, jsonify
from database.db import get_db_connection

trips_bp = Blueprint("trips", __name__)


@trips_bp.route("/service-trips/<int:shop_id>", methods=["GET"])
def get_trips(shop_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT *
        FROM service_trips
        WHERE shop_id = %s
        ORDER BY created_at DESC
        """,
        (shop_id,)
    )

    trips = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(trips)


@trips_bp.route("/service-trips", methods=["POST"])
def add_trip():
    data = request.get_json()

    shop_id = data.get("shop_id")
    customer_name = data.get("customer_name")
    customer_phone = data.get("customer_phone")
    destination = data.get("destination")
    distance_km = data.get("distance_km")
    rate_per_km = data.get("rate_per_km")

    if not shop_id or not customer_name or not destination or not distance_km or not rate_per_km:
        return jsonify({"error": "All required trip details must be filled"}), 400

    distance_km = float(distance_km)
    rate_per_km = float(rate_per_km)
    total_price = distance_km * rate_per_km

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO service_trips
            (shop_id, customer_name, customer_phone, destination, distance_km,
             rate_per_km, total_price, payment_method, payment_status, due_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, NULL, 'pending', NULL)
            """,
            (
                shop_id, customer_name, customer_phone, destination,
                distance_km, rate_per_km, total_price
            )
        )

        conn.commit()

        return jsonify({
            "message": "Trip added successfully",
            "total_price": total_price
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


@trips_bp.route("/trip-payment/cash", methods=["POST"])
def record_trip_cash_payment():
    data = request.get_json()

    trip_id = data.get("trip_id")
    shop_id = data.get("shop_id")
    customer_name = data.get("customer_name")
    amount = data.get("amount")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO service_payments
            (shop_id, service_name, customer_name, amount, payment_method)
            VALUES (%s, 'Bodaboda Trip', %s, %s, 'cash')
            """,
            (shop_id, customer_name, amount)
        )

        cursor.execute(
            """
            UPDATE service_trips
            SET payment_method = 'cash',
                payment_status = 'paid'
            WHERE id = %s
            """,
            (trip_id,)
        )

        conn.commit()

        return jsonify({"message": "Cash payment recorded successfully"})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


@trips_bp.route("/trip-payment/mpesa", methods=["POST"])
def record_trip_mpesa_payment():
    data = request.get_json()

    trip_id = data.get("trip_id")
    shop_id = data.get("shop_id")
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
            VALUES (%s, 'Bodaboda Trip', %s, %s, 'mpesa')
            """,
            (shop_id, customer_name, amount)
        )

        cursor.execute(
            """
            UPDATE service_trips
            SET payment_method = 'mpesa',
                payment_status = 'paid'
            WHERE id = %s
            """,
            (trip_id,)
        )

        conn.commit()

        return jsonify({"message": "M-PESA payment recorded successfully"})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


@trips_bp.route("/trip-payment/debt", methods=["POST"])
def record_trip_debt():
    data = request.get_json()

    trip_id = data.get("trip_id")
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
            UPDATE service_trips
            SET payment_method = 'debt',
                payment_status = 'pending',
                due_date = %s
            WHERE id = %s
            """,
            (due_date, trip_id)
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

        return jsonify({"message": "Trip debt recorded successfully"})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()