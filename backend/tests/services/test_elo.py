from app.services.elo import tier_for_elo, expected_score, elo_delta, apply_delta


def test_tier_for_elo_bronze():
    assert tier_for_elo(0).key == "BRONZE"


def test_tier_for_elo_silver_boundary():
    assert tier_for_elo(1000).key == "SILVER"


def test_tier_for_elo_legend():
    assert tier_for_elo(2500).key == "LEGEND"


def test_k_factor_descending():
    assert tier_for_elo(500).k_factor == 40
    assert tier_for_elo(1500).k_factor == 32
    assert tier_for_elo(2000).k_factor == 24
    assert tier_for_elo(2300).k_factor == 16


def test_expected_score_equal_elos():
    assert abs(expected_score(1500, 1500) - 0.5) < 1e-9


def test_elo_delta_equal_win_bronze_is_20():
    assert elo_delta(500, 500, "win") == 20


def test_elo_delta_equal_loss_master_is_neg8():
    assert elo_delta(2300, 2300, "loss") == -8


def test_elo_delta_upset_larger():
    assert elo_delta(1300, 1700, "win") > elo_delta(1500, 1500, "win")


def test_apply_delta_floor():
    assert apply_delta(10, -20) == 0
