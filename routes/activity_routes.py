from flask import Blueprint, jsonify
from database.db import get_db_connection

activity_bp = Blueprint("activity", __name__)


@activity_bp.route("/activity/<int:worker_id>", methods=["GET"])
def get_worker_activity(worker_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT 
            activity_logs.id,
            activity_logs.user_id,
            activity_logs.shop_id,
            activity_logs.action,
            activity_logs.created_at,
            shops.shop_name
        FROM activity_logs
        LEFT JOIN shops ON activity_logs.shop_id = shops.id
        WHERE activity_logs.user_id = %s
        ORDER BY activity_logs.created_at DESC
        LIMIT 30
    """, (worker_id,))

    logs = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(logs)