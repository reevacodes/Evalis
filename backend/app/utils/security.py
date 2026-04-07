from passlib.context import CryptContext

# Configure bcrypt with stronger settings
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12   # good balance of security + performance
)

def hash_password(password: str):
    password = password[:72]  # bcrypt limit
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """
    Verify a plain password against a hashed password.
    Handles edge cases safely.
    """
    try:
        plain = plain[:72]
        return pwd_context.verify(plain, hashed)
    except Exception:
        return False


def needs_rehash(hashed: str) -> bool:
    """
    Check if stored hash needs upgrading (e.g., if rounds change).
    Useful for future security upgrades.
    """
    return pwd_context.needs_update(hashed)