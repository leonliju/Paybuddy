from fastapi import APIRouter, Depends
from database import get_connection
from auth import get_current_user
from datetime import datetime
import numpy as np

router = APIRouter()

@router.get("/score")
def health_score(user=Depends(get_current_user)):
    con = get_connection()
    try:
        month = datetime.now().strftime("%Y-%m")

        income = con.execute("""
            SELECT COALESCE(SUM(amount),0)
            FROM transactions
            WHERE user_id=?
              AND direction='credit'
              AND strftime(DATE(date), '%Y-%m')=?
        """, [user["user_id"], month]).fetchone()[0]

        expenses = con.execute("""
            SELECT COALESCE(SUM(amount),0)
            FROM transactions
            WHERE user_id=?
              AND direction='debit'
              AND strftime(DATE(date), '%Y-%m')=?
        """, [user["user_id"], month]).fetchone()[0]

        # -----------------------------
        # Savings Rate (30%)
        # -----------------------------
        savings_rate = max(0, (income - expenses) / income) if income > 0 else 0
        s1 = savings_rate * 100 * 0.30

        # -----------------------------
        # Budget Adherence (25%)
        # -----------------------------
        budgets = con.execute("""
            SELECT
                b.category,
                b.limit_amount,
                COALESCE(SUM(t.amount),0) AS spent
            FROM budgets b
            LEFT JOIN transactions t
                ON b.user_id=t.user_id
               AND b.category=t.category
               AND t.direction='debit'
               AND strftime(DATE(t.date), '%Y-%m')=b.month
            WHERE b.user_id=?
              AND b.month=?
            GROUP BY b.category,b.limit_amount
        """, [user["user_id"], month]).fetchall()

        if budgets:
            within = sum(1 for b in budgets if b[2] <= b[1])
            s2 = (within / len(budgets)) * 100 * 0.25
        else:
            s2 = 12.5

        # -----------------------------
        # Spending Consistency (20%)
        # -----------------------------
        monthly = con.execute("""
            SELECT SUM(amount)
            FROM transactions
            WHERE user_id=?
              AND direction='debit'
            GROUP BY strftime(DATE(date), '%Y-%m')
            ORDER BY strftime(DATE(date), '%Y-%m') DESC
            LIMIT 6
        """, [user["user_id"]]).fetchall()

        if len(monthly) >= 2:
            vals = [float(m[0]) for m in monthly]
            mean = np.mean(vals)

            if mean > 0:
                cv = np.std(vals) / mean
            else:
                cv = 1

            s3 = max(0, 1 - cv) * 100 * 0.20
        else:
            s3 = 10

        # -----------------------------
        # Overspend Frequency (15%)
        # -----------------------------
        if budgets:
            over = sum(1 for b in budgets if b[2] > b[1])
            s4 = max(0, 1 - over / len(budgets)) * 100 * 0.15
        else:
            s4 = 7.5

        # -----------------------------
        # Commitment Coverage (10%)
        # -----------------------------
        recurring = con.execute("""
            SELECT COALESCE(SUM(amount),0)
            FROM transactions
            WHERE user_id=?
              AND direction='debit'
              AND category='Bills'
              AND strftime(DATE(date), '%Y-%m')=?
        """, [user["user_id"], month]).fetchone()[0]

        coverage = recurring / income if income > 0 else 1
        s5 = max(0, 1 - coverage) * 100 * 0.10

        score = round(s1 + s2 + s3 + s4 + s5, 1)

        if score >= 75:
            risk = "Saver"
        elif score >= 50:
            risk = "Balanced"
        elif score >= 30:
            risk = "Risky Spender"
        else:
            risk = "Impulsive Buyer"

        rationale = (
            f"Savings rate: {round(savings_rate*100,1)}% of income saved. "
            f"Budget adherence: {round(s2/0.25,1)}/100. "
            f"Spending consistency: {round(s3/0.20,1)}/100."
        )

        con.execute("""
            INSERT INTO health_scores
            (user_id, month, score, risk_classification, rationale)
            VALUES (?,?,?,?,?)
            ON CONFLICT(user_id, month)
            DO UPDATE SET
                score=excluded.score,
                risk_classification=excluded.risk_classification,
                rationale=excluded.rationale
        """, [user["user_id"], month, score, risk, rationale])

        return {
            "month": month,
            "score": score,
            "risk_classification": risk,
            "rationale": rationale,
            "breakdown": {
                "savings_rate": round(s1/0.30,1),
                "budget_adherence": round(s2/0.25,1),
                "consistency": round(s3/0.20,1)
            }
        }

    finally:
        con.close()