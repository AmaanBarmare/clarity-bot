"""Vercel / single-host entrypoint — loads FastAPI app from backend/main.py without import name clashes."""
import importlib.util
from pathlib import Path

_backend_main = Path(__file__).resolve().parent / "backend" / "main.py"
spec = importlib.util.spec_from_file_location("clarity_backend_main", _backend_main)
mod = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(mod)
app = mod.app
