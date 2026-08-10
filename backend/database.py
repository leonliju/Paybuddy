import duckdb
import os
from dotenv import load_dotenv

load_dotenv()

DB_PATH = os.getenv("DATABASE_PATH", "../data/paybuddy.duckdb")

def get_connection():
    return duckdb.connect(DB_PATH)

def init_db():
    con = get_connection()
    
    con.execute("""
        CREATE SEQUENCE IF NOT EXISTS users_seq START 1;
        CREATE TABLE IF NOT EXISTS users (
            user_id      INTEGER PRIMARY KEY DEFAULT nextval('users_seq'),
            username     VARCHAR NOT NULL UNIQUE,
            password_hash VARCHAR NOT NULL,
            created_at   TIMESTAMP DEFAULT current_timestamp
        )
    """)

    con.execute("""
        CREATE SEQUENCE IF NOT EXISTS categories_seq START 1;
        CREATE TABLE IF NOT EXISTS categories (
            category_id  INTEGER PRIMARY KEY DEFAULT nextval('categories_seq'),
            user_id      INTEGER NOT NULL,
            name         VARCHAR NOT NULL,
            is_default   INTEGER NOT NULL DEFAULT 0,
            UNIQUE (user_id, name)
        )
    """)

    con.execute("""
        CREATE SEQUENCE IF NOT EXISTS transactions_seq START 1;
        CREATE TABLE IF NOT EXISTS transactions (
            transaction_id INTEGER PRIMARY KEY DEFAULT nextval('transactions_seq'),
            user_id        INTEGER NOT NULL,
            date           DATE NOT NULL,
            amount         DOUBLE NOT NULL,
            direction      VARCHAR NOT NULL CHECK (direction IN ('debit','credit')),
            description    VARCHAR,
            merchant       VARCHAR,
            category       VARCHAR,
            source         VARCHAR NOT NULL CHECK (source IN ('manual','csv','pdf','sms','simulated','gpay_html')),
            confidence     DOUBLE,
            note           VARCHAR,
            created_at     TIMESTAMP DEFAULT current_timestamp
        )
    """)

    con.execute("""
        CREATE INDEX IF NOT EXISTS idx_txn_user_date 
        ON transactions(user_id, date)
    """)

    con.execute("""
        CREATE SEQUENCE IF NOT EXISTS feedback_seq START 1;
        CREATE TABLE IF NOT EXISTS category_feedback (
            feedback_id         INTEGER PRIMARY KEY DEFAULT nextval('feedback_seq'),
            user_id             INTEGER NOT NULL,
            transaction_id      INTEGER NOT NULL,
            description_pattern VARCHAR NOT NULL,
            original_category   VARCHAR,
            corrected_category  VARCHAR NOT NULL,
            created_at          TIMESTAMP DEFAULT current_timestamp
        )
    """)

    con.execute("""
        CREATE SEQUENCE IF NOT EXISTS budgets_seq START 1;
        CREATE TABLE IF NOT EXISTS budgets (
            budget_id    INTEGER PRIMARY KEY DEFAULT nextval('budgets_seq'),
            user_id      INTEGER NOT NULL,
            category     VARCHAR NOT NULL,
            month        VARCHAR NOT NULL,
            limit_amount DOUBLE NOT NULL,
            UNIQUE (user_id, category, month)
        )
    """)

    con.execute("""
        CREATE SEQUENCE IF NOT EXISTS goals_seq START 1;
        CREATE TABLE IF NOT EXISTS savings_goals (
            goal_id       INTEGER PRIMARY KEY DEFAULT nextval('goals_seq'),
            user_id       INTEGER NOT NULL,
            goal_name     VARCHAR NOT NULL,
            target_amount DOUBLE NOT NULL,
            deadline      DATE NOT NULL,
            created_at    TIMESTAMP DEFAULT current_timestamp
        )
    """)

    con.execute("""
        CREATE SEQUENCE IF NOT EXISTS anomaly_seq START 1;
        CREATE TABLE IF NOT EXISTS anomaly_flags (
            flag_id        INTEGER PRIMARY KEY DEFAULT nextval('anomaly_seq'),
            transaction_id INTEGER NOT NULL,
            method         VARCHAR NOT NULL CHECK (method IN ('zscore','isolation_forest')),
            reason         VARCHAR NOT NULL,
            score          DOUBLE,
            created_at     TIMESTAMP DEFAULT current_timestamp
        )
    """)

    con.execute("""
        CREATE SEQUENCE IF NOT EXISTS health_seq START 1;
        CREATE TABLE IF NOT EXISTS health_scores (
            score_id            INTEGER PRIMARY KEY DEFAULT nextval('health_seq'),
            user_id             INTEGER NOT NULL,
            month               VARCHAR NOT NULL,
            score               DOUBLE NOT NULL,
            risk_classification VARCHAR NOT NULL,
            rationale           VARCHAR,
            created_at          TIMESTAMP DEFAULT current_timestamp,
            UNIQUE (user_id, month)
        )
    """)

    con.execute("""
        CREATE SEQUENCE IF NOT EXISTS baselines_seq START 1;
        CREATE TABLE IF NOT EXISTS behavioural_baselines (
            baseline_id     INTEGER PRIMARY KEY DEFAULT nextval('baselines_seq'),
            user_id         INTEGER NOT NULL,
            computed_date   VARCHAR NOT NULL,
            late_night_freq DOUBLE,
            impulse_rate    DOUBLE,
            updated_at      TIMESTAMP DEFAULT current_timestamp,
            UNIQUE (user_id, computed_date)
        )
    """)

    con.close()
    print("Database initialised successfully")