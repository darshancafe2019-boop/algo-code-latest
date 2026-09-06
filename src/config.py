import os
from pathlib import Path
from dotenv import load_dotenv

# ==========================================
# LOAD ENVIRONMENT VARIABLES
# ==========================================
BASE_DIR = Path(__file__).resolve().parent.parent

for _env_file in [
    BASE_DIR / ".env.local",
    BASE_DIR / ".env",
    BASE_DIR / "frontend" / ".env.local",
    BASE_DIR / "frontend" / ".env",
]:
    if _env_file.is_file():
        load_dotenv(dotenv_path=_env_file, override=False)

# ==========================================
# EXCHANGE & TELEGRAM KEYS
# ==========================================
BINANCE_TESTNET_API_KEY = os.getenv("BINANCE_TESTNET_API_KEY", "")
BINANCE_TESTNET_SECRET_KEY = os.getenv("BINANCE_TESTNET_SECRET_KEY", "")
BINANCE_API_KEY = os.getenv("BINANCE_API_KEY", "") or BINANCE_TESTNET_API_KEY
BINANCE_API_SECRET = os.getenv("BINANCE_API_SECRET", "") or BINANCE_TESTNET_SECRET_KEY

# Indian Market & Broker Integration (Upstox / Dhan)
UPSTOX_CLIENT_ID = os.getenv("UPSTOX_CLIENT_ID", "")
UPSTOX_CLIENT_SECRET = os.getenv("UPSTOX_CLIENT_SECRET", "")
UPSTOX_REDIRECT_URI = os.getenv("UPSTOX_REDIRECT_URI", "http://localhost:5050/api/upstox/callback")
UPSTOX_ACCESS_TOKEN = os.getenv("UPSTOX_ACCESS_TOKEN", "")
DHAN_CLIENT_ID = os.getenv("DHAN_CLIENT_ID", "")
DHAN_ACCESS_TOKEN = os.getenv("DHAN_ACCESS_TOKEN", "")
DHAN_CLOUD_TOKEN = os.getenv("DHAN_CLOUD_TOKEN", "")
DHAN_TRADING_ENABLED = os.getenv("DHAN_TRADING_ENABLED", "false").lower() == "true"
ENABLE_INDIA_MARKET = os.getenv("ENABLE_INDIA_MARKET", "true").lower() == "true"
ENABLE_INDIA_FNO = os.getenv("ENABLE_INDIA_FNO", "false").lower() == "true"
ENABLE_BINANCE = os.getenv("ENABLE_BINANCE", "true").lower() == "true"
INDIA_BROKER = os.getenv("INDIA_BROKER", "DHAN")

# Delta Exchange Options Integration
DELTA_REST_URL = os.getenv("DELTA_REST_URL", "https://api.india.delta.exchange").rstrip("/")
DELTA_PUBLIC_WS_URL = os.getenv("DELTA_PUBLIC_WS_URL", "wss://public-socket.india.delta.exchange")
DELTA_API_KEY = os.getenv("DELTA_API_KEY", "")
DELTA_API_SECRET = os.getenv("DELTA_API_SECRET", "")
DELTA_TRADING_ENABLED = os.getenv("DELTA_TRADING_ENABLED", "false").lower() == "true"
ENABLE_DELTA_OPTIONS = os.getenv("ENABLE_DELTA_OPTIONS", "true").lower() == "true"

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")
TELEGRAM_COMMANDS_ENABLED = os.getenv("TELEGRAM_COMMANDS_ENABLED", "false").lower() == "true"
TELEGRAM_RATE_LIMIT_SEC = float(os.getenv("TELEGRAM_RATE_LIMIT_SEC", "1.0"))
TELEGRAM_MAX_RETRIES = int(os.getenv("TELEGRAM_MAX_RETRIES", "3"))
TELEGRAM_TIMEOUT_SEC = float(os.getenv("TELEGRAM_TIMEOUT_SEC", "8.0"))

# ==========================================
# FILE PATHS & DIRECTORIES
# ==========================================
BASE_DIR = Path(__file__).resolve().parent.parent

DB_PATH = BASE_DIR / os.getenv("DB_PATH", "data/trading_bot.db")
BACKUP_PATH = BASE_DIR / os.getenv("BACKUP_PATH", "backup/")
DATA_DIR = BASE_DIR / "data"
LOG_DIR = BASE_DIR / "logs"

DB_PATH.parent.mkdir(parents=True, exist_ok=True)
BACKUP_PATH.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)
LOG_DIR.mkdir(parents=True, exist_ok=True)

# Database Configuration (PostgreSQL / SQLite)
DATABASE_PROVIDER = os.getenv("DATABASE_PROVIDER", "sqlite").lower()
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH.as_posix()}")
DATABASE_MIGRATION_URL = os.getenv("DATABASE_MIGRATION_URL", DATABASE_URL)
IS_POSTGRES = DATABASE_PROVIDER == "postgresql" or DATABASE_URL.startswith("postgresql://") or DATABASE_URL.startswith("postgres://")


# Institutional Authentication, 2FA & Password Reset
AUTH_TOTP_ENCRYPTION_KEY = os.getenv("AUTH_TOTP_ENCRYPTION_KEY", "algo-crypto-secret-key-32bytes!!")
EMAIL_PROVIDER = os.getenv("EMAIL_PROVIDER", "resend").lower()
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
OTP_FROM_EMAIL = os.getenv("OTP_FROM_EMAIL", os.getenv("AUTH_EMAIL_FROM", os.getenv("RESEND_FROM_EMAIL", "Quant.OS Security <onboarding@resend.dev>")))
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", OTP_FROM_EMAIL)
AUTH_EMAIL_FROM = os.getenv("AUTH_EMAIL_FROM", OTP_FROM_EMAIL)
RESEND_WEBHOOK_SECRET = os.getenv("RESEND_WEBHOOK_SECRET", "")
AUTH_ADMIN_EMAIL = os.getenv("AUTH_ADMIN_EMAIL", "ashishparadkar1999@gmail.com")
AUTH_BOOTSTRAP_EMAIL = os.getenv("AUTH_BOOTSTRAP_EMAIL", "ashishparadkar1999@gmail.com")
APP_PUBLIC_URL = os.getenv("APP_PUBLIC_URL", "http://localhost:3100")
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

# ==========================================
# BOT IDENTIFICATION & EXECUTION SAFETY FLAGS
# ==========================================
BOT_NAME = os.getenv("BOT_NAME", "BTC Trading Bot")
EXCHANGE_NAME = os.getenv("EXCHANGE_NAME", "Binance")
TRADING_MODE = os.getenv("TRADING_MODE", "PAPER")
LIVE_TRADING_ENABLED = os.getenv("LIVE_TRADING_ENABLED", "false").lower() == "true"
MASTER_LIVE_TRADING = os.getenv("MASTER_LIVE_TRADING", "false").lower() == "true"

# Server-side in-memory safety state (Resets to False on launch/restart)
LIVE_TRADING_ARMED = False
POSITION_MISMATCH_LOCKED = False
KILL_SWITCH_FILE = DATA_DIR / "KILL_SWITCH"
GLOBAL_KILL_SWITCH = False

REQUIRE_SIGNAL_APPROVAL = os.getenv("REQUIRE_SIGNAL_APPROVAL", "true").lower() == "true"
SIGNAL_THRESHOLD_PCT = float(os.getenv("SIGNAL_THRESHOLD_PCT", "75.0"))

# ==========================================
# TESTING MODE
# ==========================================
TEST_MODE = os.getenv("TEST_MODE", "false").lower() == "true"
PAPER_TRADING = os.getenv("PAPER_TRADING", "true").lower() == "true"
VERBOSE_LOGGING = os.getenv("VERBOSE_LOGGING", "true").lower() == "true"
FORCE_TEST_SIGNAL = os.getenv("FORCE_TEST_SIGNAL", "false").lower() == "true"
TEST_TELEGRAM_ONLY = os.getenv("TEST_TELEGRAM_ONLY", "false").lower() == "true"

# ==========================================
# SERVER-SIDE HARD SAFETY LIMITS
# ==========================================
MAX_POSITION_SIZE = float(os.getenv("MAX_POSITION_SIZE", "1.0"))
MAX_ORDER_VALUE = float(os.getenv("MAX_ORDER_VALUE", "10000.0"))
MAX_DAILY_LOSS = float(os.getenv("MAX_DAILY_LOSS", "500.0"))
MAX_TOTAL_EXPOSURE = float(os.getenv("MAX_TOTAL_EXPOSURE", "25000.0"))
MAX_OPEN_POSITIONS = int(os.getenv("MAX_OPEN_POSITIONS", "3"))
MAX_TRADES_PER_DAY = int(os.getenv("MAX_TRADES_PER_DAY", "20"))
MAX_MARKET_DATA_AGE_SECONDS = int(os.getenv("MAX_MARKET_DATA_AGE_SECONDS", "60"))

# ==========================================
# BOT SCHEDULING
# ==========================================
CHECK_INTERVAL_MINS = int(os.getenv("CHECK_INTERVAL_MINS", "1"))
HEARTBEAT_MINUTES = int(os.getenv("HEARTBEAT_MINUTES", "5"))

# ==========================================
# EXCHANGE SETTINGS
# ==========================================
SYMBOL = os.getenv("SYMBOL", "BTC/USDT")
TIMEFRAME = os.getenv("TIMEFRAME", "5m")
SUPPORTED_TIMEFRAMES = ["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d"]

# ==========================================
# EMA SETTINGS
# ==========================================
EMA_FAST_CROSS = int(os.getenv("EMA_FAST_CROSS", "9"))
EMA_SLOW_CROSS = int(os.getenv("EMA_SLOW_CROSS", "20"))
EMA_SUPPORT = int(os.getenv("EMA_SUPPORT", "50"))
EMA_TREND_FILTER = int(os.getenv("EMA_TREND_FILTER", "200"))

# ==========================================
# MACD SETTINGS
# ==========================================
MACD_FAST = int(os.getenv("MACD_FAST", "12"))
MACD_SLOW = int(os.getenv("MACD_SLOW", "26"))
MACD_SIGNAL = int(os.getenv("MACD_SIGNAL", "9"))

# ==========================================
# VOLUME PROFILE SETTINGS
# ==========================================
VP_LOOKBACK_DAYS = int(os.getenv("VP_LOOKBACK_DAYS", "7"))
VP_VALUE_AREA_PCT = float(os.getenv("VP_VALUE_AREA_PCT", "0.70"))
VP_BUFFER_PCT = float(os.getenv("VP_BUFFER_PCT", "0.02"))
VP_BIN_SIZE_USDT = float(os.getenv("VP_BIN_SIZE_USDT", "25.0"))

# ==========================================
# STRATEGY OPTIONS
# ==========================================
ALLOW_SHORTS = os.getenv("ALLOW_SHORTS", "true").lower() == "true"
USE_EMA9_FILTER = os.getenv("USE_EMA9_FILTER", "false").lower() == "true"
USE_RSI_FILTER = os.getenv("USE_RSI_FILTER", "false").lower() == "true"
USE_DAILY_BIAS_FILTER = os.getenv("USE_DAILY_BIAS_FILTER", "false").lower() == "true"
RSI_TIMEFRAME = os.getenv("RSI_TIMEFRAME", "5m")
RSI_LENGTH = int(os.getenv("RSI_LENGTH", "14"))

# ==========================================
# RISK MANAGEMENT
# ==========================================
RISK_PCT_PER_TRADE = float(os.getenv("RISK_PCT_PER_TRADE", "0.02"))
MAX_CONCURRENT_POSITIONS = int(os.getenv("MAX_CONCURRENT_POSITIONS", "1"))
DAILY_LOSS_LIMIT_PCT = float(os.getenv("DAILY_LOSS_LIMIT_PCT", "-0.20"))
STOP_LOSS_METHOD = os.getenv("STOP_LOSS_METHOD", "tighter")
SWING_LOOKBACK_CANDLES = int(os.getenv("SWING_LOOKBACK_CANDLES", "5"))
TAKE_PROFIT_METHOD = os.getenv("TAKE_PROFIT_METHOD", "risk_reward")
FIXED_STOP_LOSS_PCT = float(os.getenv("FIXED_STOP_LOSS_PCT", "0.10"))
FIXED_RISK_REWARD_RATIO = float(os.getenv("FIXED_RISK_REWARD_RATIO", "3.0"))

# ==========================================
# KILL SWITCH
# ==========================================
KILL_SWITCH_FILE = BASE_DIR / os.getenv("KILL_SWITCH_FILE", "kill_switch.flag")

# ==========================================
# BACKTEST SETTINGS
# ==========================================
BACKTEST_FEE_PCT = float(os.getenv("BACKTEST_FEE_PCT", "0.0010"))
BACKTEST_SLIPPAGE_PCT = float(os.getenv("BACKTEST_SLIPPAGE_PCT", "0.0005"))

# ==========================================
# LOGGING
# ==========================================
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_TO_FILE = os.getenv("LOG_TO_FILE", "true").lower() == "true"
LOG_FILE = BASE_DIR / os.getenv("LOG_FILE", "logs/trading_bot.log")
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

# ==========================================
# TELEGRAM ALERTS
# ==========================================
SEND_STARTUP_MESSAGE = os.getenv("SEND_STARTUP_MESSAGE", "true").lower() == "true"
SEND_TRADE_ALERTS = os.getenv("SEND_TRADE_ALERTS", "true").lower() == "true"
SEND_ERROR_ALERTS = os.getenv("SEND_ERROR_ALERTS", "true").lower() == "true"
SEND_HEARTBEAT_MESSAGES = os.getenv("SEND_HEARTBEAT_MESSAGES", "false").lower() == "true"

# ==========================================
# DATABASE
# ==========================================
SAVE_ALL_CANDLES = os.getenv("SAVE_ALL_CANDLES", "false").lower() == "true"
SAVE_SIGNALS = os.getenv("SAVE_SIGNALS", "true").lower() == "true"
SAVE_TRADES = os.getenv("SAVE_TRADES", "true").lower() == "true"
DB_BACKUP_ENABLED = os.getenv("DB_BACKUP_ENABLED", "true").lower() == "true"
DB_BACKUP_INTERVAL_HOURS = int(os.getenv("DB_BACKUP_INTERVAL_HOURS", "24"))
DB_INTEGRITY_CHECK_ENABLED = os.getenv("DB_INTEGRITY_CHECK_ENABLED", "true").lower() == "true"

# ==========================================
# DEBUG
# ==========================================
PRINT_INDICATORS = os.getenv("PRINT_INDICATORS", "true").lower() == "true"
PRINT_SIGNALS = os.getenv("PRINT_SIGNALS", "true").lower() == "true"
PRINT_ORDER_DETAILS = os.getenv("PRINT_ORDER_DETAILS", "true").lower() == "true"

# ==========================================
# HEARTBEAT
# ==========================================
HEARTBEAT_MINUTES = int(os.getenv("HEARTBEAT_MINUTES", "5"))

# ==========================================
# MULTI-INDICATOR CONFLUENCE STRATEGY
# ==========================================
CONFLUENCE_THRESHOLD = float(os.getenv("CONFLUENCE_THRESHOLD", "0.75"))
REQUIRED_CONFLUENCE_COUNT = int(os.getenv("REQUIRED_CONFLUENCE_COUNT", "3"))
MAX_INDICATOR_LIMIT = int(os.getenv("MAX_INDICATOR_LIMIT", "12"))
ACTIVE_INDICATORS_DEFAULT = ["ema", "macd", "rsi", "vp"]