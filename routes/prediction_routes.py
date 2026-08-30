from flask import Blueprint, jsonify, request
from database.db import get_db_connection

prediction_bp = Blueprint("prediction", __name__)


def money(value):
    return f"Ksh {float(value):,.2f}"


@prediction_bp.route("/predictions", methods=["GET"])
def get_predictions():
    shop_id = request.args.get("shop_id")
    business_type = request.args.get("business_type", "product")

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    if business_type == "service":

        cursor.execute("""
            SELECT 
                service_category
            FROM shops
            WHERE id = %s
        """, (shop_id,))

        shop = cursor.fetchone()
        service_category = shop["service_category"] if shop else "service"

        cursor.execute("""
            SELECT 
                COUNT(*) AS total_sales,
                COALESCE(SUM(amount), 0) AS total_revenue,
                COALESCE(AVG(amount), 0) AS average_sale
            FROM service_payments
            WHERE shop_id = %s
        """, (shop_id,))

        summary = cursor.fetchone()

        cursor.execute("""
            SELECT 
                DATE(payment_date) AS sale_day,
                SUM(amount) AS daily_total
            FROM service_payments
            WHERE shop_id = %s
            GROUP BY DATE(payment_date)
            ORDER BY sale_day ASC
        """, (shop_id,))

        daily_sales = cursor.fetchall()

        cursor.execute("""
            SELECT 
                service_name AS product_name,
                COUNT(*) AS total_quantity_sold,
                SUM(amount) AS total_income
            FROM service_payments
            WHERE shop_id = %s
            GROUP BY service_name
            ORDER BY total_income DESC
            LIMIT 5
        """, (shop_id,))

        best_items = cursor.fetchall()

        cursor.execute("""
            SELECT
                payment_method,
                SUM(amount) AS total_amount,
                COUNT(*) AS payment_count
            FROM service_payments
            WHERE shop_id = %s
            GROUP BY payment_method
        """, (shop_id,))

        payment_methods = cursor.fetchall()

        cursor.execute("""
            SELECT
                COUNT(*) AS unpaid_debts,
                COALESCE(SUM(amount), 0) AS total_unpaid
            FROM debts
            WHERE shop_id = %s
            AND status != 'paid'
        """, (shop_id,))

        debt_summary = cursor.fetchone()

        cursor.execute("""
            SELECT
                destination,
                COUNT(*) AS trip_count,
                SUM(total_price) AS destination_income
            FROM service_trips
            WHERE shop_id = %s
            GROUP BY destination
            ORDER BY destination_income DESC
            LIMIT 1
        """, (shop_id,))

        top_destination = cursor.fetchone()

        insights = []

        total_revenue = float(summary["total_revenue"])
        average_sale = float(summary["average_sale"])
        predicted_next_sale = average_sale

        if total_revenue == 0:
            insights.append(
                "There is not enough payment data yet. Record more paid transactions so the system can give stronger business advice."
            )
        else:
            insights.append(
                f"Your total recorded income is {money(total_revenue)} with an average earning of {money(average_sale)} per paid transaction."
            )

        if best_items:
            best = best_items[0]
            if service_category == "bodaboda":
                insights.append(
                    f"Your most profitable trip category is {best['product_name']}, bringing in {money(best['total_income'])}. Focus on similar trips or routes to increase income."
                )
            else:
                insights.append(
                    f"{best['product_name']} is your strongest service, earning {money(best['total_income'])}. Promote it more and consider offering related services to increase profit."
                )

        if payment_methods:
            top_payment = max(payment_methods, key=lambda item: float(item["total_amount"]))
            insights.append(
                f"Most of your income is coming through {top_payment['payment_method']}. Keep encouraging reliable payment methods that are easy to track."
            )

        if debt_summary and float(debt_summary["total_unpaid"]) > 0:
            insights.append(
                f"You currently have {money(debt_summary['total_unpaid'])} in unpaid debts. To protect profit, follow up early and avoid giving more debt to customers with overdue balances."
            )

        if service_category == "bodaboda" and top_destination:
            insights.append(
                f"The destination bringing the most income is {top_destination['destination']} with {money(top_destination['destination_income'])}. You can target customers going around this route more often."
            )

        if average_sale > 0:
            insights.append(
                f"Based on your current records, your next expected earning is around {money(predicted_next_sale)}. Try to keep most transactions above this value to improve daily income."
            )

        cursor.close()
        conn.close()

        return jsonify({
            "business_type": "service",
            "total_sales": summary["total_sales"],
            "total_revenue": total_revenue,
            "average_sale": average_sale,
            "predicted_next_sale_amount": predicted_next_sale,
            "daily_sales": daily_sales,
            "best_selling_products": best_items,
            "payment_methods": payment_methods,
            "insight": "<br><br>".join(insights)
        })

    else:

        cursor.execute("""
            SELECT 
                COUNT(*) AS total_sales,
                COALESCE(SUM(total_amount), 0) AS total_revenue,
                COALESCE(AVG(total_amount), 0) AS average_sale
            FROM sales
            WHERE shop_id = %s
        """, (shop_id,))

        summary = cursor.fetchone()

        cursor.execute("""
            SELECT 
                DATE(sale_date) AS sale_day,
                SUM(total_amount) AS daily_total
            FROM sales
            WHERE shop_id = %s
            GROUP BY DATE(sale_date)
            ORDER BY sale_day ASC
        """, (shop_id,))

        daily_sales = cursor.fetchall()

        cursor.execute("""
            SELECT 
                products.name AS product_name,
                SUM(sale_items.quantity) AS total_quantity_sold
            FROM sale_items
            JOIN products ON sale_items.product_id = products.id
            JOIN sales ON sale_items.sale_id = sales.id
            WHERE sales.shop_id = %s
            GROUP BY products.id, products.name
            ORDER BY total_quantity_sold DESC
            LIMIT 5
        """, (shop_id,))

        best_items = cursor.fetchall()

        cursor.execute("""
            SELECT
                sales.payment_method,
                SUM(sales.total_amount) AS total_amount,
                COUNT(*) AS payment_count
            FROM sales
            WHERE sales.shop_id = %s
            GROUP BY sales.payment_method
        """, (shop_id,))

        payment_methods = cursor.fetchall()

        cursor.execute("""
            SELECT
                products.name AS product_name,
                inventory.quantity
            FROM inventory
            JOIN products ON inventory.product_id = products.id
            WHERE inventory.shop_id = %s
            AND inventory.quantity <= 20
            ORDER BY inventory.quantity ASC
            LIMIT 3
        """, (shop_id,))

        low_stock = cursor.fetchall()

        cursor.execute("""
            SELECT
                COUNT(*) AS unpaid_debts,
                COALESCE(SUM(amount), 0) AS total_unpaid
            FROM debts
            WHERE shop_id = %s
            AND status != 'paid'
        """, (shop_id,))

        debt_summary = cursor.fetchone()

        total_revenue = float(summary["total_revenue"])
        average_sale = float(summary["average_sale"])
        predicted_next_sale = average_sale

        insights = []

        if total_revenue == 0:
            insights.append(
                "There is not enough sales data yet. Record more sales so the system can generate stronger business advice."
            )
        else:
            insights.append(
                f"Your total revenue is {money(total_revenue)} and your average sale is {money(average_sale)}."
            )

        if best_items:
            best = best_items[0]
            insights.append(
                f"{best['product_name']} is your fastest-selling product with {best['total_quantity_sold']} units sold. Keep it well stocked to avoid losing customers."
            )

        if low_stock:
            low_names = ", ".join([item["product_name"] for item in low_stock])
            insights.append(
                f"The following products are running low: {low_names}. Restock them soon to avoid missed sales."
            )

        if payment_methods:
            top_payment = max(payment_methods, key=lambda item: float(item["total_amount"]))
            insights.append(
                f"Most revenue is coming through {top_payment['payment_method']}. Use this to understand how customers prefer to pay."
            )

        if debt_summary and float(debt_summary["total_unpaid"]) > 0:
            insights.append(
                f"You have {money(debt_summary['total_unpaid'])} in unpaid debts. Reduce profit risk by following up early and limiting new debt sales."
            )

        if average_sale > 0:
            insights.append(
                f"Based on current sales, your next expected sale is around {money(predicted_next_sale)}. Try bundling small items to push each sale above this amount."
            )

        cursor.close()
        conn.close()

        return jsonify({
            "business_type": "product",
            "total_sales": summary["total_sales"],
            "total_revenue": total_revenue,
            "average_sale": average_sale,
            "predicted_next_sale_amount": predicted_next_sale,
            "daily_sales": daily_sales,
            "best_selling_products": best_items,
            "payment_methods": payment_methods,
            "insight": "<br><br>".join(insights)
        })