from fastapi import APIRouter, Depends
from pydantic import BaseModel
from database import get_connection
from auth import get_current_user

router = APIRouter()

class CorrectionRequest(BaseModel):
    transaction_id: int
    corrected_category: str

@router.get("/low-confidence")
def low_confidence(user=Depends(get_current_user)):
    con = get_connection()
    try:
        rows = con.execute("""
            SELECT transaction_id, date, merchant, description,
                   category, confidence, amount
            FROM transactions
            WHERE user_id=? AND confidence < 0.80
            AND confidence IS NOT NULL
            ORDER BY confidence ASC
        """, [user["user_id"]]).fetchall()
        cols = ['transaction_id','date','merchant','description',
                'category','confidence','amount']
        return [dict(zip(cols, r)) for r in rows]
    finally:
        con.close()

@router.post("/correct")
def correct(req: CorrectionRequest, user=Depends(get_current_user)):
    con = get_connection()
    try:
        txn = con.execute("""
            SELECT description, merchant, category FROM transactions
            WHERE transaction_id=? AND user_id=?
        """, [req.transaction_id, user["user_id"]]).fetchone()

        if not txn:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Transaction not found")

        original_category = txn[2]
        pattern = f"{txn[0]} {txn[1]}".lower().strip()[:100]

        con.execute("""
            UPDATE transactions SET category=?, confidence=1.0
            WHERE transaction_id=? AND user_id=?
        """, [req.corrected_category, req.transaction_id, user["user_id"]])

        con.execute("""
            INSERT INTO category_feedback
            (user_id, transaction_id, description_pattern,
             original_category, corrected_category)
            VALUES (?,?,?,?,?)
        """, [user["user_id"], req.transaction_id, pattern,
              original_category, req.corrected_category])

        return {"message": "Category updated and feedback stored"}
    finally:
        con.close()

@router.get("/stats")
def feedback_stats(user=Depends(get_current_user)):
    con = get_connection()
    try:
        total = con.execute(
            "SELECT COUNT(*) FROM transactions WHERE user_id=?",
            [user["user_id"]]
        ).fetchone()[0]
        corrected = con.execute(
            "SELECT COUNT(*) FROM category_feedback WHERE user_id=?",
            [user["user_id"]]
        ).fetchone()[0]
        low_conf = con.execute(
            "SELECT COUNT(*) FROM transactions WHERE user_id=? AND confidence < 0.80",
            [user["user_id"]]
        ).fetchone()[0]
        return {
            "total_transactions": total,
            "corrections_made":   corrected,
            "needs_review":       low_conf
        }
    finally:
        con.close()