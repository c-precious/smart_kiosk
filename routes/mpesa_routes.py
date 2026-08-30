from flask import Blueprint, jsonify, request
import os
import requests
import base64
import json
from datetime import datetime, timedelta
from requests.auth import HTTPBasicAuth
from dotenv import load_dotenv
from database.db import get_db_connection

load_dotenv()

mpesa_bp = Blueprint("mpesa", __name__)

CONSUMER_KEY = os.getenv("MPESA_CONSUMER_KEY")
CONSUMER_SECRET = os.getenv("MPESA_CONSUMER_SECRET")
SHORTCODE = os.getenv("MPESA_SHORTCODE")
PASSKEY = os.getenv("MPESA_PASSKEY")
CALLBACK_URL = os.getenv("MPESA_CALLBACK_URL")


def get_access_token():
    response = requests.get(
        "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
        auth=HTTPBasicAuth(CONSUMER_KEY, CONSUMER_SECRET),
        timeout=20
    )
    response.raise_for_status()
    return response.json()["access_token"]


@mpesa_bp.route("/mpesa-token-test", methods=["GET"])
def mpesa_token_test():
    try:
        token = get_access_token()
        return jsonify({
            "message": "M-PESA token generated successfully",
            "access_token": token
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@mpesa_bp.route("/mpesa-stk-push", methods=["POST"])
def mpesa_stk_push():
    data = request.get_json()
    print("REQUEST DATA:", data)

    phone = str(data.get("phone", "")).strip()
    amount = data.get("amount")
    payment_type = data.get("payment_type", "schedule")

    schedule_id = data.get("schedule_id")
    trip_id = data.get("trip_id")
    sale_items = data.get("items")

    shop_id = data.get("shop_id")
    customer_name = data.get("customer_name")
    service_name = data.get("service_name", "Service Payment")

    if not phone or not amount or not shop_id:
        return jsonify({"error": "Phone, amount and shop_id are required"}), 400

    if payment_type == "schedule" and not schedule_id:
        return jsonify({"error": "schedule_id is required for schedule payments"}), 400

    if payment_type == "trip" and not trip_id:
        return jsonify({"error": "trip_id is required for trip payments"}), 400

    if payment_type == "sale" and not sale_items:
        return jsonify({"error": "Sale items are required for product M-PESA payments"}), 400

    if phone.startswith("0"):
        phone = "254" + phone[1:]
    elif phone.startswith("+254"):
        phone = phone[1:]
    elif phone.startswith("254"):
        pass
    else:
        return jsonify({"error": "Invalid phone number. Use 07XXXXXXXX or 2547XXXXXXXX"}), 400

    amount = int(float(amount))

    try:
        access_token = get_access_token()

        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        password = base64.b64encode(
            (SHORTCODE + PASSKEY + timestamp).encode("utf-8")
        ).decode("utf-8")

        payload = {
            "BusinessShortCode": SHORTCODE,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": amount,
            "PartyA": phone,
            "PartyB": SHORTCODE,
            "PhoneNumber": phone,
            "CallBackURL": CALLBACK_URL,
            "AccountReference": "SmartKiosk",
            "TransactionDesc": "Smart Kiosk Payment"
        }

        response = requests.post(
            "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            },
            json=payload,
            timeout=30
        )

        response_data = response.json()

        if response.status_code == 200 and response_data.get("ResponseCode") == "0":
            conn = get_db_connection()
            cursor = conn.cursor()

            cursor.execute(
                """
                INSERT INTO mpesa_transactions
                (checkout_request_id, merchant_request_id, schedule_id, trip_id,
                 payment_type, shop_id, customer_name, service_name, amount, phone,
                 status, sale_items_json)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending', %s)
                """,
                (
                    response_data.get("CheckoutRequestID"),
                    response_data.get("MerchantRequestID"),
                    schedule_id,
                    trip_id,
                    payment_type,
                    shop_id,
                    customer_name,
                    service_name,
                    amount,
                    phone,
                    json.dumps(sale_items) if sale_items else None
                )
            )

            conn.commit()
            cursor.close()
            conn.close()

        return jsonify(response_data), response.status_code

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@mpesa_bp.route("/mpesa-callback", methods=["POST"])
def mpesa_callback():
    data = request.get_json()

    print("========== M-PESA CALLBACK RECEIVED ==========")
    print(data)
    print("=============================================")

    try:
        callback = data["Body"]["stkCallback"]
        result_code = callback["ResultCode"]
        checkout_request_id = callback["CheckoutRequestID"]

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT *
            FROM mpesa_transactions
            WHERE checkout_request_id = %s
            """,
            (checkout_request_id,)
        )

        transaction = cursor.fetchone()

        if not transaction:
            cursor.close()
            conn.close()
            return jsonify({"message": "Transaction not found"}), 404

        if result_code == 0:

            if transaction["payment_type"] == "schedule":

                cursor.execute(
                    """
                    INSERT INTO service_payments
                    (shop_id, service_name, customer_name, amount, payment_method)
                    VALUES (%s, %s, %s, %s, 'mpesa')
                    """,
                    (
                        transaction["shop_id"],
                        transaction["service_name"],
                        transaction["customer_name"],
                        transaction["amount"]
                    )
                )

                cursor.execute(
                    """
                    UPDATE service_schedule
                    SET payment_method = 'mpesa',
                        payment_status = 'paid'
                    WHERE id = %s
                    """,
                    (transaction["schedule_id"],)
                )

            elif transaction["payment_type"] == "trip":

                cursor.execute(
                    """
                    INSERT INTO service_payments
                    (shop_id, service_name, customer_name, amount, payment_method)
                    VALUES (%s, %s, %s, %s, 'mpesa')
                    """,
                    (
                        transaction["shop_id"],
                        transaction["service_name"],
                        transaction["customer_name"],
                        transaction["amount"]
                    )
                )

                cursor.execute(
                    """
                    UPDATE service_trips
                    SET payment_method = 'mpesa',
                        payment_status = 'paid'
                    WHERE id = %s
                    """,
                    (transaction["trip_id"],)
                )

            elif transaction["payment_type"] == "sale":

                kenya_time = datetime.utcnow() + timedelta(hours=3)
                sale_items = json.loads(transaction["sale_items_json"])

                cursor.execute(
                    """
                    INSERT INTO sales
                    (shop_id, total_amount, payment_method, customer_name, phone, sale_date)
                    VALUES (%s, %s, 'Mpesa', %s, %s, %s)
                    """,
                    (
                        transaction["shop_id"],
                        transaction["amount"],
                        transaction["customer_name"],
                        transaction["phone"],
                        kenya_time
                    )
                )

                sale_id = cursor.lastrowid

                for item in sale_items:
                    product_id = item["product_id"]
                    quantity = int(item["quantity"])

                    cursor.execute(
                        """
                        SELECT price
                        FROM products
                        WHERE id = %s AND shop_id = %s
                        """,
                        (product_id, transaction["shop_id"])
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
                        (quantity, product_id, transaction["shop_id"])
                    )

            cursor.execute(
                """
                UPDATE mpesa_transactions
                SET status = 'paid'
                WHERE checkout_request_id = %s
                """,
                (checkout_request_id,)
            )

        else:
            cursor.execute(
                """
                UPDATE mpesa_transactions
                SET status = 'failed'
                WHERE checkout_request_id = %s
                """,
                (checkout_request_id,)
            )

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"message": "Callback processed successfully"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500