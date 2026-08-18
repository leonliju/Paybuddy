"""
Runtime interface to the Stage 3 NLP fallback classifier.

Loads the trained model (backend/models/nlp_fallback_model.joblib) lazily,
once, on first use. If the artifact is missing or fails to load, predict()
returns None and categorise() in transactions.py simply falls through to
its pre-existing behaviour ('Other', 0.50) -- a missing/corrupt model file
degrades gracefully rather than breaking transaction ingestion.

Model card / honest performance note (see PR description for full detail):
trained on a 206-row dataset authored specifically for this project (not
the original NLP report's 474-row dataset, whose artifacts were never
handed over -- see nlp_fallback/dataset.py's module docstring). Held-out
accuracy on semantically-indirect examples (the only tier Stage 3 actually
sees in production) was ~50% in the most recent training run, meaningfully
above the ~12.5% random-chance baseline for 8-way classification, but well
below the report's own 93.5%/97.2% figures on their larger dataset. This
is a real, working, but modest fallback -- not a polished production
classifier. MIN_ACCEPT_PROB below exists specifically to stop it from
confidently guessing wrong on inputs it doesn't recognise; retrain with
more data (e.g. accumulated corrections from merchant_overrides) to
improve it over time.
"""
import os

import joblib

from nlp_fallback.preprocessing import lemmatize
from nlp_fallback.train import MODEL_PATH

# Minimum calibrated probability required to trust Stage 3's own prediction.
# Below this, the model is treated as "not confident enough to guess" and
# categorise() falls through to 'Other'/0.50 exactly as if Stage 3 didn't
# exist. 0.35 sits meaningfully above the ~0.125 random-chance baseline for
# 8 classes while still being low enough for the model to actually fire on
# a reasonable fraction of indirect-language transactions.
MIN_ACCEPT_PROB = 0.35

# Calibrated probability is mapped into this range for the confidence value
# surfaced to the rest of the app, so Stage 3 predictions always rank below
# a Stage 2 regex hit (0.75) and above the flat 'Other' default (0.50) --
# consistent with the confidence ordering used throughout categorise().
_CONF_FLOOR = 0.51
_CONF_CEILING = 0.74

_MODEL = None
_LOAD_ATTEMPTED = False


def _get_model():
    global _MODEL, _LOAD_ATTEMPTED
    if _MODEL is None and not _LOAD_ATTEMPTED:
        _LOAD_ATTEMPTED = True
        if os.path.exists(MODEL_PATH):
            try:
                _MODEL = joblib.load(MODEL_PATH)
            except Exception:
                _MODEL = None
    return _MODEL


def predict(text: str):
    """
    Returns (category, confidence) if the model is available and confident
    enough to trust its own top prediction, else None (caller should treat
    this exactly like a Stage 2 miss).
    """
    model = _get_model()
    if model is None or not text or not text.strip():
        return None

    lemmatized = lemmatize(text)
    if not lemmatized.strip():
        return None

    proba = model.predict_proba([lemmatized])[0]
    classes = model.classes_
    best_idx = proba.argmax()
    best_prob = proba[best_idx]

    if best_prob < MIN_ACCEPT_PROB:
        return None

    category = classes[best_idx]
    # Linearly map [MIN_ACCEPT_PROB, 1.0] -> [_CONF_FLOOR, _CONF_CEILING]
    span = 1.0 - MIN_ACCEPT_PROB
    scaled = _CONF_FLOOR + (best_prob - MIN_ACCEPT_PROB) / span * (_CONF_CEILING - _CONF_FLOOR)
    confidence = round(min(scaled, _CONF_CEILING), 2)

    # Cast away numpy scalar types (np.str_/np.float64) so callers -- JSON
    # serialisation, the DuckDB driver -- get plain Python str/float.
    return str(category), float(confidence)
