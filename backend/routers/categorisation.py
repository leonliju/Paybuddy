from fastapi import APIRouter, Depends
from pydantic import BaseModel
from database import get_connection
from auth import get_current_user
from routers.transactions import _normalise

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

        # Extend the user's learned dictionary so future transactions from
        # this merchant are categorised correctly without another correction.
        # Prefer the merchant name (more stable across transactions than
        # free-text description); fall back to description only if merchant
        # is blank. Known limitation: a multi-word description fallback can
        # be over-specific and won't generalise the way a proper NER-based
        # merchant extractor would — see the NLP fallback stage follow-up.
        keyword_source = txn[1] if txn[1] and txn[1].strip() else txn[0]
        keyword = _normalise(keyword_source or "")[:100]

        if keyword:
            existing_override = con.execute("""
                SELECT override_id FROM merchant_overrides
                WHERE user_id=? AND keyword=?
            """, [user["user_id"], keyword]).fetchone()

            if existing_override:
                con.execute("""
                    UPDATE merchant_overrides
                    SET category=?, correction_count = correction_count + 1,
                        updated_at=current_timestamp
                    WHERE override_id=?
                """, [req.corrected_category, existing_override[0]])
            else:
                con.execute("""
                    INSERT INTO merchant_overrides (user_id, keyword, category)
                    VALUES (?,?,?)
                """, [user["user_id"], keyword, req.corrected_category])

        return {"message": "Category updated and feedback stored"}
    finally:
        con.close()

@router.get("/overrides")
def list_overrides(user=Depends(get_current_user)):
    """Learned merchant/keyword -> category mappings for this user, most
    frequently corrected first, so corrections are visible/auditable rather
    than a silent black box."""
    con = get_connection()
    try:
        rows = con.execute("""
            SELECT keyword, category, correction_count, updated_at
            FROM merchant_overrides
            WHERE user_id=?
            ORDER BY correction_count DESC, updated_at DESC
        """, [user["user_id"]]).fetchall()
        cols = ['keyword', 'category', 'correction_count', 'updated_at']
        return [dict(zip(cols, r)) for r in rows]
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