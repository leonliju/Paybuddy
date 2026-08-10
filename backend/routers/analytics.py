from fastapi import APIRouter, Depends
from database import get_connection
from auth import get_current_user
from datetime import datetime

router = APIRouter()


@router.get("/summary")
def summary(user=Depends(get_current_user)):
    con = get_connection()
    try:
        month = datetime.now().strftime("%Y-%m")

        income = con.execute("""
            SELECT COALESCE(SUM(amount), 0)
            FROM transactions
            WHERE user_id = ?
              AND direction = 'credit'
              AND strftime(DATE(date), '%Y-%m') = ?
        """, [user["user_id"], month]).fetchone()[0]

        expenses = con.execute("""
            SELECT COALESCE(SUM(amount), 0)
            FROM transactions
            WHERE user_id = ?
              AND direction = 'debit'
              AND strftime(DATE(date), '%Y-%m') = ?
        """, [user["user_id"], month]).fetchone()[0]

        return {
            "month": month,
            "total_income": round(float(income), 2),
            "total_expenses": round(float(expenses), 2),
            "net": round(float(income) - float(expenses), 2)
        }

    finally:
        con.close()


@router.get("/by-category")
def by_category(user=Depends(get_current_user)):
    con = get_connection()
    try:
        month = datetime.now().strftime("%Y-%m")

        rows = con.execute("""
            SELECT
                category,
                SUM(amount) AS total
            FROM transactions
            WHERE user_id = ?
              AND direction = 'debit'
              AND strftime(DATE(date), '%Y-%m') = ?
            GROUP BY category
            ORDER BY total DESC
        """, [user["user_id"], month]).fetchall()

        return [
            {
                "category": r[0],
                "total": round(float(r[1]), 2)
            }
            for r in rows
        ]

    finally:
        con.close()


@router.get("/monthly-trend")
def monthly_trend(user=Depends(get_current_user)):
    con = get_connection()
    try:
        rows = con.execute("""
            SELECT
                strftime(DATE(date), '%Y-%m') AS month,
                SUM(amount) AS total
            FROM transactions
            WHERE user_id = ?
              AND direction = 'debit'
            GROUP BY month
            ORDER BY month DESC
            LIMIT 6
        """, [user["user_id"]]).fetchall()

        return [
            {
                "month": r[0],
                "total": round(float(r[1]), 2)
            }
            for r in reversed(rows)
        ]

    finally:
        con.close()


@router.get("/recent")
def recent(user=Depends(get_current_user)):
    con = get_connection()
    try:
        rows = con.execute("""
            SELECT
                transaction_id,
                date,
                merchant,
                category,
                amount,
                direction
            FROM transactions
            WHERE user_id = ?
            ORDER BY date DESC, created_at DESC
            LIMIT 10
        """, [user["user_id"]]).fetchall()

        cols = [
            "transaction_id",
            "date",
            "merchant",
            "category",
            "amount",
            "direction"
        ]

        return [dict(zip(cols, row)) for row in rows]

    finally:
        con.close()


@router.get("/cashflow-calendar")
def cashflow_calendar(user=Depends(get_current_user)):
    con = get_connection()
    try:
        rows = con.execute("""
            SELECT
                merchant,
                amount,
                DAY(DATE(date)) AS day_of_month,
                COUNT(*) AS frequency
            FROM transactions
            WHERE user_id = ?
              AND direction = 'debit'
              AND DATE(date) >= CURRENT_DATE - INTERVAL 3 MONTH
            GROUP BY merchant, amount, DAY(DATE(date))
            HAVING COUNT(*) >= 2
            ORDER BY day_of_month
        """, [user["user_id"]]).fetchall()

        cols = [
            "merchant",
            "amount",
            "day_of_month",
            "frequency"
        ]

        return [dict(zip(cols, row)) for row in rows]

    finally:
        con.close()