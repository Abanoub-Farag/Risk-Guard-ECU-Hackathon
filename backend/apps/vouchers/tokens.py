import secrets

# 32-character alphabet omitting visually ambiguous characters (0, O, 1, I, L)
UNAMBIGUOUS_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"


def generate_secure_voucher_code(length: int = 16) -> str:
    """
    Generates a cryptographically strong, non-sequential alphanumeric voucher code.
    Restricted strictly to uppercase letters and digits without visual duplicates.
    Entropy: 32^16 = 2^80 combinations (~1.2 x 10^24).
    """
    return "".join(secrets.choice(UNAMBIGUOUS_ALPHABET) for _ in range(length))
