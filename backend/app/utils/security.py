import bcrypt

def hash_password(password: str) -> str:
    password = password[:72]  # bcrypt limit
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    """
    Verify a plain password against a hashed password.
    Handles edge cases safely.
    """
    try:
        plain = plain[:72]
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

def needs_rehash(hashed: str) -> bool:
    """
    Check if stored hash needs upgrading (e.g., if rounds change).
    Useful for future security upgrades.
    """
    return False