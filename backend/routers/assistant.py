from fastapi import APIRouter, Depends
from pydantic import BaseModel
from database import get_connection
from auth import get_current_user

import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

router = APIRouter()


# -----------------------------
# Intent Keywords
# -----------------------------
INTENT_KEYWORDS = {
    "spending_lookup": [
        "how much", "spent", "spend", "total", "cost", "paid"
    ],
    "forecast": [
        "next month", "predict", "forecast", "future", "will i"
    ],
    "anomaly": [
        "unusual", "suspicious", "anomaly",
        "flagged", "weird", "strange"
    ],
    "comparative": [
        "most", "highest", "lowest",
        "compare", "which category",
        "best", "worst"
    ],
    "savings": [
        "goal", "save", "saving",
        "achieve", "target", "feasible"
    ],
    "dead_money": [
        "subscription", "waste",
        "unused", "zombie", "duplicate"
    ]
}


# -----------------------------
# Request Model
# -----------------------------
class AskRequest(BaseModel):
    question: str


# -----------------------------
# Intent Classification
# -----------------------------
def classify_intent(question: str):
    q = question.lower()

    for intent, keywords in INTENT_KEYWORDS.items():
        if any(word in q for word in keywords):
            return intent

    return "spending_lookup"


# -----------------------------
# Context Retrieval
# -----------------------------
def retrieve_context(intent, user_id, con):

    if intent == "spending_lookup":

        rows = con.execute("""
            SELECT category,
                   SUM(amount) AS total
            FROM transactions
            WHERE user_id=?
              AND direction='debit'
            GROUP BY category
            ORDER BY total DESC
        """, [user_id]).fetchall()

        return "Category spending:\n" + "\n".join(
            f"{r[0]} : ₹{r[1]:,.2f}"
            for r in rows
        )


    elif intent == "forecast":

        rows = con.execute("""
            SELECT
                strftime(DATE(date), '%Y-%m') AS month,
                SUM(amount) AS total
            FROM transactions
            WHERE user_id=?
              AND direction='debit'
            GROUP BY strftime(DATE(date), '%Y-%m')
            ORDER BY strftime(DATE(date), '%Y-%m') DESC
            LIMIT 6
        """, [user_id]).fetchall()

        return "Recent Monthly Spending:\n" + "\n".join(
            f"{r[0]} : ₹{r[1]:,.2f}"
            for r in rows
        )


    elif intent == "anomaly":

        rows = con.execute("""
            SELECT
                t.merchant,
                t.amount,
                t.category,
                af.reason
            FROM anomaly_flags af
            JOIN transactions t
            ON af.transaction_id=t.transaction_id
            WHERE t.user_id=?
            ORDER BY t.amount DESC
            LIMIT 5
        """, [user_id]).fetchall()

        if not rows:
            return "No anomalies detected."

        return "Flagged Transactions:\n" + "\n".join(
            f"{r[0]} : ₹{r[1]:,.2f} ({r[2]}) - {r[3]}"
            for r in rows
        )


    elif intent == "savings":

        rows = con.execute("""
            SELECT
                goal_name,
                target_amount,
                deadline
            FROM savings_goals
            WHERE user_id=?
        """, [user_id]).fetchall()

        if not rows:
            return "No savings goals."

        return "Savings Goals:\n" + "\n".join(
            f"{r[0]} : ₹{r[1]:,.2f} by {r[2]}"
            for r in rows
        )


    elif intent == "dead_money":

        rows = con.execute("""
            SELECT merchant,
                   amount
            FROM transactions
            WHERE user_id=?
              AND category='Bills'
            ORDER BY amount DESC
            LIMIT 10
        """, [user_id]).fetchall()

        if not rows:
            return "No recurring bills found."

        return "Recurring Bills:\n" + "\n".join(
            f"{r[0]} : ₹{r[1]:,.2f}"
            for r in rows
        )


    else:

        rows = con.execute("""
            SELECT category,
                   SUM(amount)
            FROM transactions
            WHERE user_id=?
              AND direction='debit'
            GROUP BY category
            ORDER BY SUM(amount) DESC
        """, [user_id]).fetchall()

        return "Category Spending:\n" + "\n".join(
            f"{r[0]} : ₹{r[1]:,.2f}"
            for r in rows
        )


# -----------------------------
# Ask Endpoint
# -----------------------------
@router.post("/ask")
def ask(req: AskRequest, user=Depends(get_current_user)):

    con = get_connection()

    try:

        intent = classify_intent(req.question)

        context = retrieve_context(
            intent,
            user["user_id"],
            con
        )

    finally:

        con.close()

    prompt = f"""
You are PayBuddy, an intelligent personal finance assistant.

Rules:
- Use ONLY the information provided below.
- Never make up amounts.
- Mention amounts in Indian Rupees (₹).
- Keep the answer short (3-5 sentences).
- If data is unavailable, clearly say so.
- End with:
Source: User transaction data.

Context:

{context}

Question:

{req.question}
"""

    api_key = os.getenv("GEMINI_API_KEY")

    print("API Key Loaded:", "Yes" if api_key else "No")

    if api_key:

        try:

            client = genai.Client(api_key=api_key)

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )

            return {
                "answer": response.text,
                "intent": intent,
                "context": context,
                "source": "gemini"
            }

        except Exception as e:

            print("Gemini Error:", e)

    return {
        "answer":
            f"Based on your data:\n\n{context}\n\n"
            "Gemini could not be reached, so this response was generated from your stored transaction data.",
        "intent": intent,
        "context": context,
        "source": "fallback"
    }