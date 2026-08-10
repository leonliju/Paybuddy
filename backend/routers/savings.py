from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from database import get_connection
from auth import get_current_user
from datetime import datetime

router = APIRouter()


class GoalRequest(BaseModel):
    goal_name: str
    target_amount: float
    deadline: str


@router.get("/goals")
def get_goals(user=Depends(get_current_user)):
    con = get_connection()
    try:
        rows = con.execute("""
            SELECT
                goal_id,
                goal_name,
                target_amount,
                deadline,
                created_at
            FROM savings_goals
            WHERE user_id=?
            ORDER BY deadline
        """, [user["user_id"]]).fetchall()

        cols = [
            "goal_id",
            "goal_name",
            "target_amount",
            "deadline",
            "created_at"
        ]

        return [dict(zip(cols, r)) for r in rows]

    finally:
        con.close()


@router.post("/goals")
def add_goal(req: GoalRequest, user=Depends(get_current_user)):
    con = get_connection()
    try:
        con.execute("""
            INSERT INTO savings_goals
            (user_id, goal_name, target_amount, deadline)
            VALUES (?,?,?,?)
        """, [
            user["user_id"],
            req.goal_name,
            req.target_amount,
            req.deadline
        ])

        return {"message": "Goal added"}

    finally:
        con.close()


@router.get("/feasibility/{goal_id}")
def feasibility(goal_id: int, user=Depends(get_current_user)):
    con = get_connection()
    try:
        goal = con.execute("""
            SELECT
                goal_name,
                target_amount,
                deadline
            FROM savings_goals
            WHERE goal_id=?
              AND user_id=?
        """, [goal_id, user["user_id"]]).fetchone()

        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")

        deadline = datetime.strptime(str(goal[2]), "%Y-%m-%d")

        months = max(
            1,
            (deadline.year - datetime.now().year) * 12 +
            deadline.month - datetime.now().month
        )

        required = float(goal[1]) / months

        avg_income = con.execute("""
            SELECT COALESCE(AVG(monthly),0)
            FROM (
                SELECT SUM(amount) AS monthly
                FROM transactions
                WHERE user_id=?
                  AND direction='credit'
                GROUP BY strftime(DATE(date), '%Y-%m')
                ORDER BY strftime(DATE(date), '%Y-%m') DESC
                LIMIT 3
            )
        """, [user["user_id"]]).fetchone()[0]

        avg_expense = con.execute("""
            SELECT COALESCE(AVG(monthly),0)
            FROM (
                SELECT SUM(amount) AS monthly
                FROM transactions
                WHERE user_id=?
                  AND direction='debit'
                GROUP BY strftime(DATE(date), '%Y-%m')
                ORDER BY strftime(DATE(date), '%Y-%m') DESC
                LIMIT 3
            )
        """, [user["user_id"]]).fetchone()[0]

        current_surplus = float(avg_income) - float(avg_expense)
        feasible = current_surplus >= required

        suggestions = con.execute("""
            SELECT
                category,
                SUM(amount) AS total
            FROM transactions
            WHERE user_id=?
              AND direction='debit'
            GROUP BY category
            ORDER BY total DESC
            LIMIT 3
        """, [user["user_id"]]).fetchall()

        return {
            "goal_name": goal[0],
            "target_amount": float(goal[1]),
            "months_remaining": months,
            "required_monthly": round(required, 2),
            "current_surplus": round(current_surplus, 2),
            "feasible": feasible,
            "suggestions": [
                {
                    "category": s[0],
                    "total": round(float(s[1]), 2),
                    "reduce_by": round(float(s[1]) * 0.10, 2)
                }
                for s in suggestions
            ]
        }

    finally:
        con.close()