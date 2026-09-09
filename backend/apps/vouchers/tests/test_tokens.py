from apps.vouchers.tokens import UNAMBIGUOUS_ALPHABET, generate_secure_voucher_code


class TestVoucherTokenGenerator:
    """
    Unit tests verifying the cryptographic randomness, character constraints,
    and entropy of the voucher code generator.
    """

    def test_code_length_and_characters(self) -> None:
        code = generate_secure_voucher_code()
        assert len(code) == 16
        # All characters must belong to the unambiguous alphabet
        assert all(c in UNAMBIGUOUS_ALPHABET for c in code)

    def test_exclusion_of_ambiguous_characters(self) -> None:
        # 0, O, 1, I, L must NEVER appear in generated voucher codes
        ambiguous_chars = {"0", "O", "1", "I", "L"}
        for _ in range(500):
            code = generate_secure_voucher_code()
            for char in ambiguous_chars:
                assert char not in code

    def test_entropy_and_uniqueness(self) -> None:
        # Generate 1,000 codes and ensure zero collisions
        codes = {generate_secure_voucher_code() for _ in range(1000)}
        assert len(codes) == 1000
