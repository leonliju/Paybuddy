from fastapi import APIRouter, Depends
from pydantic import BaseModel
from database import get_connection
from auth import get_current_user
from datetime import datetime

router = APIRouter()


class BudgetRequest(BaseModel):
    category: str
    month: str
    limit_amount: float


@router.get("/status")
def budget_status(user=Depends(get_current_user)):
    con = get_connection()
    try:
        month = datetime.now().strftime("%Y-%m")

        rows = con.execute("""
            SELECT
                b.category,
                b.limit_amount,
                COALESCE(SUM(t.amount), 0) AS spent
            FROM budgets b
            LEFT JOIN transactions t
                ON b.user_id = t.user_id
               AND b.category = t.category
               AND t.direction = 'debit'
               AND strftime(DATE(t.date), '%Y-%m') = ?
            WHERE b.user_id = ?
              AND b.month = ?
            GROUP BY b.category, b.limit_amount
            ORDER BY b.category
        """, [month, user["user_id"], month]).fetchall()

        result = []

        for r in rows:
            spent = float(r[2])
            limit_amount = float(r[1])

            if limit_amount > 0:
                percentage = round((spent / limit_amount) * 100, 1)
            else:
                percentage = 0

            if spent > limit_amount:
                status = "over"
            elif spent > limit_amount * 0.8:
                status = "warning"
            else:
                status = "ok"

            result.append({
                "category": r[0],
                "limit_amount": limit_amount,
                "spent": round(spent, 2),
                "percentage": percentage,
                "status": status
            })

        return result

    finally:
        con.close()


@router.post("/set")
def set_budget(req: BudgetRequest, user=Depends(get_current_user)):
    con = get_connection()
    try:
        con.execute("""
            INSERT INTO budgets (
                user_id,
                category,
                month,
                limit_amount
            )
            VALUES (?,?,?,?)
            ON CONFLICT(user_id, category, month)
            DO UPDATE SET
                limit_amount = excluded.limit_amount
        """, [
            user["user_id"],
            req.category,
            req.month,
            req.limit_amount
        ])

        return {
            "message": "Budget saved successfully"
        }

    finally:
        con.close()