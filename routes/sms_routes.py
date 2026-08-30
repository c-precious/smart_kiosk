from flask import Blueprint, request, jsonify
import os
import requests
from dotenv import load_dotenv

load_dotenv()

sms_bp = Blueprint("sms", __name__)

AT_USERNAME = os.getenv("AT_USERNAME")
AT_API_KEY = os.getenv("AT_API_KEY")


@sms_bp.route("/send-sms-reminder", methods=["POST"])
def send_sms_reminder():

    data = request.get_json()

    phone = str(data.get("phone", "")).strip()
    customer_name = data.get("customer_name")
    amount = data.get("amount")
    due_date = data.get("due_date")
    shop_name = data.get("shop_name")

    if not phone:
        return jsonify({"error": "Customer phone number is required"}), 400

    if phone.startswith("0"):
        phone = "+254" + phone[1:]
    elif phone.startswith("254"):
        phone = "+" + phone
    elif not phone.startswith("+254"):
        return jsonify({
            "error": "Invalid phone number format. Use 07XXXXXXXX or +2547XXXXXXXX"
        }), 400

    message = (
        f"Hello {customer_name}, this is a reminder that you have an unpaid "
        f"balance of Ksh {amount} at {shop_name}. "
        f"Kindly clear it by {due_date}. Thank you."
    )

    try:
        response = requests.post(
            "https://api.sandbox.africastalking.com/version1/messaging",
            headers={
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
                "apiKey": AT_API_KEY
            },
            data={
                "username": AT_USERNAME,
                "to": phone,
                "message": message
            },
            timeout=20
        )

        return jsonify({
            "message": "SMS request sent",
            "status_code": response.status_code,
            "response": response.text,
            "phone": phone
        }), response.status_code

    except Exception as e:
        return jsonify({
            "error": str(e),
            "phone_attempted": phone
        }), 500