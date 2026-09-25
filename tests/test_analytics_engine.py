import io
import json
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from analytics_engine import (
    build_chart,
    build_demo_data,
    clean_dataframe,
    describe_recommendations,
    get_best_chart,
    load_uploaded_dataset,
    numeric_columns,
    summarize_dataframe,
)
from backend_api import app


@pytest.fixture
def client():
    return TestClient(app)


def test_demo_data_returns_expected_shape():
    df = build_demo_data()
    assert not df.empty
    assert len(df.columns) >= 5
    assert "Sales" in df.columns


def test_numeric_columns_detected():
    df = pd.DataFrame({
        "Date": ["2024-01-01", "2024-01-02"],
        "Region": ["North", "South"],
        "Sales": [100, 200],
        "Profit": [50, 75],
    })
    cols = numeric_columns(df)
    assert "Sales" in cols
    assert "Profit" in cols
    assert "Region" not in cols


def test_datetime_inference_in_clean_dataframe():
    df = pd.DataFrame({
        "order_date": ["2024-01-01", "2024-01-02", "2024-01-03"],
        "amount": [10, 20, 30],
    })
    cleaned = clean_dataframe(df)
    assert pd.api.types.is_datetime64_any_dtype(cleaned["order_date"])


def test_best_chart_for_time_series_is_line_chart():
    df = pd.DataFrame({
        "Date": pd.date_range("2024-01-01", periods=5, freq="D"),
        "Sales": [10, 15, 13, 18, 22],
    })
    fig = get_best_chart(df)
    assert fig.data[0].type == "scatter"


def test_recommendations_are_generated():
    df = build_demo_data()
    recs = describe_recommendations(df)
    assert isinstance(recs, list)
    assert len(recs) > 0


def test_load_uploaded_dataset_csv_and_json():
    csv_bytes = b"Date,Sales\n2024-01-01,100\n2024-01-02,200\n"
    csv_file = io.BytesIO(csv_bytes)
    csv_file.name = "data.csv"
    df_csv = load_uploaded_dataset(csv_file)
    assert len(df_csv) == 2
    assert "Sales" in df_csv.columns
    assert pd.api.types.is_datetime64_any_dtype(df_csv["Date"])

    json_bytes = json.dumps([{"Product": "A", "Qty": 5}, {"Product": "B", "Qty": 10}]).encode()
    json_file = io.BytesIO(json_bytes)
    json_file.name = "items.json"
    df_json = load_uploaded_dataset(json_file)
    assert len(df_json) == 2
    assert "Product" in df_json.columns


def test_load_uploaded_dataset_unsupported():
    invalid_file = io.BytesIO(b"random bytes")
    invalid_file.name = "archive.zip"
    with pytest.raises(ValueError, match="Unsupported file type"):
        load_uploaded_dataset(invalid_file)


def test_high_cardinality_bar_capping():
    # 200 categories should be capped to 12 traces
    df = pd.DataFrame({
        "Category": [f"Cat_{i}" for i in range(200)],
        "Value": range(200),
    })
    fig = build_chart(df, "Bar chart")
    assert len(fig.data) <= 12


def test_high_cardinality_pie_capping():
    # 50 categories should be capped to 10 slices
    df = pd.DataFrame({
        "Category": [f"Cat_{i % 50}" for i in range(200)],
    })
    fig = build_chart(df, "Pie chart")
    assert len(fig.data[0].labels) <= 10


def test_all_chart_types_build_successfully():
    df = build_demo_data()
    chart_types = [
        "Bar chart",
        "Line chart",
        "Scatter plot",
        "Histogram",
        "Pie chart",
        "Correlation heatmap",
    ]
    for ctype in chart_types:
        fig = build_chart(df, ctype)
        assert fig is not None


def test_api_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_api_demo_endpoint(client):
    response = client.get("/demo")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "chart" in data
    assert "summary" in data


def test_api_analyze_empty_file(client):
    response = client.post(
        "/analyze",
        data={"chart_type": "Auto best fit"},
        files={"file": ("empty.csv", b"", "text/csv")},
    )
    assert response.status_code == 400
    assert response.json()["success"] is False
    assert "empty" in response.json()["error"].lower()


def test_api_analyze_valid_csv(client):
    csv_content = b"Date,Sales,Region\n2024-01-01,500,North\n2024-01-02,700,South\n"
    response = client.post(
        "/analyze",
        data={"chart_type": "Auto best fit"},
        files={"file": ("sales.csv", csv_content, "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["summary"]["rows"] == 2
    assert "Sales" in data["summary"]["numeric_fields"]

