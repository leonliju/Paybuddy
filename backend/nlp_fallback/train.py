"""
Trains the Stage 3 NLP fallback classifier:
  spaCy lemmatization -> TF-IDF -> Logistic Regression, calibrated via
  CalibratedClassifierCV (Platt scaling) so predict_proba gives genuine
  probabilities rather than arbitrary decision-function scores.

Run this manually to (re)build the model artifact:
    python -m nlp_fallback.train
(from the backend/ directory, with the venv active)

Requires: spacy (+ en_core_web_sm), scikit-learn, joblib -- all already
listed as dependencies elsewhere in this project (see PayBuddy's
Technology Stack in the design doc; none of these are new additions).

Writes backend/models/nlp_fallback_model.joblib. classifier.py loads that
file lazily at first prediction; if it's missing, Stage 3 simply never
fires and categorise() falls straight through to Stage-2-miss behaviour
('Other', 0.50) exactly as it did before this PR -- so a missing/corrupt
model file degrades gracefully rather than breaking the app.
"""
import os
import sys

import joblib
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from sklearn.pipeline import Pipeline

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from nlp_fallback.dataset import build_dataset
from nlp_fallback.preprocessing import lemmatize

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "nlp_fallback_model.joblib")


def train(test_size: float = 0.2, random_state: int = 42):
    texts, labels, tiers = build_dataset()
    print(f"Loaded {len(texts)} labelled rows across {len(set(labels))} categories.")

    print("Lemmatizing...")
    lemmatized = [lemmatize(t) for t in texts]

    idx = list(range(len(texts)))
    idx_train, idx_test = train_test_split(
        idx, test_size=test_size, random_state=random_state, stratify=labels
    )
    X_train = [lemmatized[i] for i in idx_train]
    X_test = [lemmatized[i] for i in idx_test]
    y_train = [labels[i] for i in idx_train]
    y_test = [labels[i] for i in idx_test]
    tiers_test = [tiers[i] for i in idx_test]
    print(f"Train: {len(X_train)} rows, Test: {len(X_test)} rows")

    # Unigrams only, min_df=1: this is the config that came out ahead in a
    # 5-fold CV sweep over the pilot dataset (unigrams generalise better than
    # bigrams here purely because the dataset is still small -- bigram
    # features are too sparse to learn from reliably at this size. Revisit
    # this once the dataset grows past a few hundred rows per category).
    base_pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 1), min_df=1)),
        ("clf", LogisticRegression(max_iter=1000, class_weight="balanced")),
    ])

    # CalibratedClassifierCV wraps the whole pipeline so predict_proba
    # reflects genuine calibrated probabilities rather than raw logits --
    # this is what lets categorise() treat the output as a real confidence
    # score instead of an arbitrary number. cv=3 keeps this workable on a
    # small pilot dataset; increase once the dataset grows.
    model = CalibratedClassifierCV(base_pipeline, method="sigmoid", cv=3)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    print(f"\nOverall held-out accuracy: {acc:.3f}")
    print(classification_report(y_test, preds, zero_division=0))

    # Tier-specific accuracy matters more than the overall number: Stage 3
    # only ever fires in production on text that already missed Stage 1/2,
    # i.e. exactly the semantically_indirect tier. dict/keyword-tier accuracy
    # here is a generalisation sanity check, not the deployment-relevant
    # metric.
    for tier in sorted(set(tiers_test)):
        tier_idx = [i for i, t in enumerate(tiers_test) if t == tier]
        if not tier_idx:
            continue
        tier_y = [y_test[i] for i in tier_idx]
        tier_pred = [preds[i] for i in tier_idx]
        tier_acc = accuracy_score(tier_y, tier_pred)
        print(f"  {tier}: n={len(tier_idx)}, accuracy={tier_acc:.3f}")

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    print(f"\nSaved model to {MODEL_PATH}")
    return model, acc


if __name__ == "__main__":
    train()
