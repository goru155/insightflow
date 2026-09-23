import pandas as pd

from analytics_engine import build_demo_data, describe_recommendations, get_best_chart, numeric_columns


def test_demo_data_returns_expected_shape():
    df = build_demo_data()
    assert not df.empty
    assert len(df.columns) >= 5
    assert 'Sales' in df.columns


def test_numeric_columns_detected():
    df = pd.DataFrame({
        'Date': ['2024-01-01', '2024-01-02'],
        'Region': ['North', 'South'],
        'Sales': [100, 200],
        'Profit': [50, 75],
    })
    cols = numeric_columns(df)
    assert 'Sales' in cols
    assert 'Profit' in cols
    assert 'Region' not in cols


def test_best_chart_for_time_series_is_line_chart():
    df = pd.DataFrame({
        'Date': pd.date_range('2024-01-01', periods=5, freq='D'),
        'Sales': [10, 15, 13, 18, 22],
    })
    fig = get_best_chart(df)
    assert fig.data[0].type == 'scatter'


def test_recommendations_are_generated():
    df = build_demo_data()
    recs = describe_recommendations(df)
    assert isinstance(recs, list)
    assert len(recs) > 0
