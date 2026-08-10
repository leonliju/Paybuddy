from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routers import (
    auth, transactions, analytics,
    categorisation, forecast, anomaly,
    health, budget, savings, deadmoney, assistant
)

app = FastAPI(title="PayBuddy API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()

app.include_router(auth.router,           prefix="/auth",           tags=["Auth"])
app.include_router(transactions.router,   prefix="/transactions",   tags=["Transactions"])
app.include_router(analytics.router,      prefix="/analytics",      tags=["Analytics"])
app.include_router(categorisation.router, prefix="/categorisation", tags=["Categorisation"])
app.include_router(forecast.router,       prefix="/forecast",       tags=["Forecast"])
app.include_router(anomaly.router,        prefix="/anomaly",        tags=["Anomaly"])
app.include_router(health.router,         prefix="/health",         tags=["Health"])
app.include_router(budget.router,         prefix="/budget",         tags=["Budget"])
app.include_router(savings.router,        prefix="/savings",        tags=["Savings"])
app.include_router(deadmoney.router,      prefix="/deadmoney",      tags=["Dead Money"])
app.include_router(assistant.router,      prefix="/assistant",      tags=["Assistant"])

@app.get("/")
def root():
    return {"message": "PayBuddy API v2.0 running"}