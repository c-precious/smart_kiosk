from flask import Flask
from flask_cors import CORS
from database.db import get_db_connection

app = Flask(__name__)
CORS(app)

from flask import Flask, render_template

@app.route("/")
def home():
    return render_template("login.html")

@app.route("/register-page")
def register_page():
    return render_template("register.html")

@app.route("/dashboard-page")
def dashboard_page():
    return render_template("dashboard.html")

@app.route("/shop-page")
def shop_page():
    return render_template("shop.html")

@app.route("/inventory-page")
def inventory_page():
    return render_template("inventory.html")

@app.route("/sales-page")
def sales_page():
    return render_template("sales.html")

@app.route("/customers-page")
def customers_page():
    return render_template("customer.html")

@app.route("/debts-page")
def debts_page():
    return render_template("debt.html")

@app.route("/alerts-page")
def alerts_page():
    return render_template("alerts.html")

@app.route("/reports-page")
def reports_page():
    return render_template("reports.html")

@app.route("/profile-page")
def profile_page():
    return render_template("profile.html")

@app.route("/test-db")
def test_db():
    conn = get_db_connection()

    if conn.is_connected():
        conn.close()
        return "Database connected successfully!"

    return "Database connection failed"

@app.route("/service-shop-page")
def service_shop_page():
    return render_template("service_shop.html")

@app.route("/schedule-page")
def schedule_page():
    return render_template("schedule.html")

@app.route("/payments-page")
def payments_page():
    return render_template("payments.html")

@app.route("/trips-page")
def trips_page():
    return render_template("trips.html")

@app.route("/monitoring-page")
def monitoring_page():
    return render_template("monitoring.html")

from routes.products_routes import products_bp
app.register_blueprint(products_bp)

from routes.inventory_routes import inventory_bp
app.register_blueprint(inventory_bp)

from routes.customer_routes import customers_bp
app.register_blueprint(customers_bp)

from routes.sales_routes import sales_bp
app.register_blueprint(sales_bp)

from routes.debt_routes import debts_bp
app.register_blueprint(debts_bp)

from routes.notification_routes import notifications_bp
app.register_blueprint(notifications_bp)

from routes.prediction_routes import prediction_bp
app.register_blueprint(prediction_bp)

from routes.auth_routes import auth_bp
app.register_blueprint(auth_bp)

from routes.shop_routes import shops_bp
app.register_blueprint(shops_bp)

from routes.service_routes import service_bp
app.register_blueprint(service_bp)

from routes.trip_routes import trips_bp
app.register_blueprint(trips_bp)

from routes.sms_routes import sms_bp
app.register_blueprint(sms_bp)

from routes.mpesa_routes import mpesa_bp
app.register_blueprint(mpesa_bp)

from routes.worker_routes import workers_bp
app.register_blueprint(workers_bp)

from routes.activity_routes import activity_bp
app.register_blueprint(activity_bp)

if __name__ == "__main__":
    app.run(debug=True)
    