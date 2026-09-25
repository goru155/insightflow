import io
import json
import re
from typing import Any, Dict, List

import numpy as np
import pandas as pd
import plotly.express as px

try:
    import pdfplumber
except Exception:  # pragma: no cover
    pdfplumber = None


def clean_dataframe(df):
    if df is None or df.empty:
        return pd.DataFrame()
    df = df.copy()
    df.columns = [str(col).strip() for col in df.columns]
    df = df.loc[:, ~df.columns.duplicated()].copy()
    df = df.dropna(axis=0, how="all").reset_index(drop=True)

    # Attempt datetime inference for string and object columns
    for col in df.columns:
        if pd.api.types.is_string_dtype(df[col]) or pd.api.types.is_object_dtype(df[col]):
            # Check if column has non-null values before trying conversion
            non_null = df[col].dropna()
            if not non_null.empty and any(k in str(col).lower() for k in ["date", "time", "year", "month", "day"]):
                try:
                    df[col] = pd.to_datetime(df[col])
                except (ValueError, TypeError, OverflowError):
                    pass
    return df


def detect_pdf_tables(file_bytes):
    if pdfplumber is None:
        raise ImportError("pdfplumber is required. Install it with: pip install pdfplumber")

    frames = []
    if isinstance(file_bytes, (bytes, bytearray)):
        pdf_bytes = file_bytes
    elif hasattr(file_bytes, "getvalue"):
        pdf_bytes = file_bytes.getvalue()
    elif hasattr(file_bytes, "read"):
        pdf_bytes = file_bytes.read()
    else:
        raise ValueError("Invalid file input for PDF parsing.")

    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            for table in tables or []:
                if not table or len(table) < 2:
                    continue
                header = [
                    str(cell).strip() if cell is not None else f"Column_{idx}"
                    for idx, cell in enumerate(table[0])
                ]
                rows = table[1:]
                frames.append(pd.DataFrame(rows, columns=header))

            if not frames:
                text = page.extract_text() or ""
                if text.strip():
                    lines = []
                    for line in text.splitlines():
                        cleaned = re.sub(r"\s{2,}", ",", line.strip())
                        if cleaned:
                            lines.append(cleaned)
                    if lines:
                        content = "\n".join(lines)
                        try:
                            parsed = pd.read_csv(io.StringIO(content), sep=r"\s{2,}|\t|,", engine="python")
                            if not parsed.empty:
                                frames.append(parsed)
                        except Exception:
                            pass

    if not frames:
        raise ValueError("No readable table data was found in the PDF.")

    combined = pd.concat(frames, ignore_index=True)
    return clean_dataframe(combined)


def load_uploaded_dataset(uploaded_file):
    if uploaded_file is None:
        return pd.DataFrame()

    if hasattr(uploaded_file, "name") and uploaded_file.name:
        file_name = str(uploaded_file.name).lower()
    else:
        file_name = "uploaded.data"

    file_type = file_name.split(".")[-1]

    # Safely extract raw bytes once to prevent stream exhaustion
    if hasattr(uploaded_file, "getvalue"):
        raw_bytes = uploaded_file.getvalue()
    elif hasattr(uploaded_file, "read"):
        raw_bytes = uploaded_file.read()
        if hasattr(uploaded_file, "seek"):
            uploaded_file.seek(0)
    elif isinstance(uploaded_file, (bytes, bytearray)):
        raw_bytes = uploaded_file
    else:
        raise ValueError("Invalid file input")

    byte_buffer = io.BytesIO(raw_bytes)

    if file_type == "csv":
        return clean_dataframe(pd.read_csv(byte_buffer))
    if file_type in {"xlsx", "xls"}:
        return clean_dataframe(pd.read_excel(byte_buffer))
    if file_type == "json":
        try:
            return clean_dataframe(pd.read_json(byte_buffer))
        except Exception:
            byte_buffer.seek(0)
            return clean_dataframe(pd.read_json(byte_buffer, lines=True))
    if file_type in {"txt"}:
        try:
            return clean_dataframe(pd.read_csv(byte_buffer, sep=None, engine="python"))
        except Exception:
            byte_buffer.seek(0)
            return clean_dataframe(pd.read_csv(byte_buffer, sep=",", engine="python"))
    if file_type == "pdf":
        return detect_pdf_tables(raw_bytes)

    raise ValueError(f"Unsupported file type: {file_type}")


def numeric_columns(df):
    return [col for col in df.columns if pd.api.types.is_numeric_dtype(df[col])]


def categorical_columns(df):
    cols = []
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]) or pd.api.types.is_datetime64_any_dtype(df[col]):
            continue
        non_null = df[col].dropna()
        if non_null.empty:
            continue
        cols.append(col)
    return cols


def build_demo_data():
    rng = np.random.default_rng(42)
    rows = 200
    data = {
        "Date": pd.date_range("2024-01-01", periods=rows, freq="D"),
        "Region": rng.choice(["North", "South", "East", "West"], size=rows),
        "Product": rng.choice(["A", "B", "C"], size=rows),
        "Sales": rng.integers(100, 5000, size=rows),
        "Profit": rng.integers(20, 1200, size=rows),
        "Customers": rng.integers(30, 550, size=rows),
        "Channel": rng.choice(["Online", "Retail", "Wholesale"], size=rows),
    }
    return pd.DataFrame(data)


def _aggregate_top_categories(df, category_col, value_col, top_n=12):
    agg = df.groupby(category_col, as_index=False)[value_col].mean()
    if len(agg) > top_n:
        top = agg.nlargest(top_n - 1, value_col)
        other_val = agg[~agg[category_col].isin(top[category_col])][value_col].mean()
        other_df = pd.DataFrame([{category_col: "Other", value_col: other_val}])
        agg = pd.concat([top, other_df], ignore_index=True)
    return agg


def _top_category_counts(df, category_col, top_n=10):
    counts = df[category_col].value_counts()
    if len(counts) > top_n:
        top = counts.head(top_n - 1)
        other_sum = counts.iloc[top_n - 1:].sum()
        res = top.to_dict()
        res["Other"] = int(other_sum)
        df_counts = pd.DataFrame(list(res.items()), columns=[category_col, "Count"])
    else:
        df_counts = counts.reset_index()
        df_counts.columns = [category_col, "Count"]
    return df_counts


def get_best_chart(df):
    numeric = numeric_columns(df)
    categorical = categorical_columns(df)
    datetime_cols = [col for col in df.columns if pd.api.types.is_datetime64_any_dtype(df[col])]

    if df.empty:
        return px.scatter(title="No data available")

    if datetime_cols and numeric:
        x_col = datetime_cols[0]
        y_col = numeric[0]
        sorted_df = df.sort_values(by=x_col)
        return px.line(sorted_df, x=x_col, y=y_col, title=f"Trend analysis for {y_col}")

    if len(numeric) >= 2:
        x_col, y_col = numeric[0], numeric[1]
        color = categorical[0] if (categorical and df[categorical[0]].nunique() <= 10) else None
        return px.scatter(df, x=x_col, y=y_col, color=color, title=f"{x_col} vs {y_col}")

    if numeric and categorical:
        category_col = categorical[0]
        value_col = numeric[0]
        agg = _aggregate_top_categories(df, category_col, value_col, top_n=12)
        return px.bar(agg, x=category_col, y=value_col, color=category_col, title=f"{value_col} by {category_col}")

    if numeric:
        return px.histogram(df, x=numeric[0], nbins=25, title=f"Distribution of {numeric[0]}")

    if categorical:
        counts = _top_category_counts(df, categorical[0], top_n=10)
        return px.pie(counts, names=categorical[0], values="Count", title=f"Composition of {categorical[0]}")

    return px.bar(title="No suitable chart found for the current dataset")


def build_chart(df, chart_type):
    numeric = numeric_columns(df)
    categorical = categorical_columns(df)
    datetime_cols = [col for col in df.columns if pd.api.types.is_datetime64_any_dtype(df[col])]

    if chart_type == "Auto best fit":
        return get_best_chart(df)

    if chart_type == "Bar chart":
        if not numeric:
            raise ValueError("This dataset does not contain numeric columns for a bar chart.")
        target_col = numeric[0]
        group_col = categorical[0] if categorical else "index"
        if group_col == "index":
            temp_df = df.reset_index().rename(columns={"index": "Row"}).head(50)
            return px.bar(temp_df, x="Row", y=target_col, title=f"{target_col} by row (first 50)")
        agg = _aggregate_top_categories(df, group_col, target_col, top_n=12)
        return px.bar(agg, x=group_col, y=target_col, color=group_col, title=f"{target_col} by {group_col}")

    if chart_type == "Line chart":
        if not numeric:
            raise ValueError("This dataset does not contain numeric data for a line chart.")
        if datetime_cols:
            sorted_df = df.sort_values(by=datetime_cols[0])
            return px.line(sorted_df, x=datetime_cols[0], y=numeric[0], title=f"Trend for {numeric[0]}")
        temp_df = df.reset_index().rename(columns={"index": "Row"}).head(100)
        return px.line(temp_df, x="Row", y=numeric[0], title=f"Trend for {numeric[0]} (first 100 rows)")

    if chart_type == "Scatter plot":
        if len(numeric) < 2:
            raise ValueError("This dataset needs at least two numeric columns for a scatter plot.")
        color = categorical[0] if (categorical and df[categorical[0]].nunique() <= 10) else None
        return px.scatter(df, x=numeric[0], y=numeric[1], color=color, title=f"{numeric[0]} vs {numeric[1]}")

    if chart_type == "Histogram":
        if not numeric:
            raise ValueError("This dataset does not contain numeric data for a histogram.")
        return px.histogram(df, x=numeric[0], nbins=25, title=f"Distribution of {numeric[0]}")

    if chart_type == "Pie chart":
        if not categorical:
            raise ValueError("This dataset does not contain categorical data for a pie chart.")
        counts = _top_category_counts(df, categorical[0], top_n=10)
        return px.pie(counts, names=categorical[0], values="Count", title=f"Share of {categorical[0]}")

    if chart_type == "Correlation heatmap":
        if len(numeric) < 2:
            raise ValueError("This dataset needs at least two numeric columns for a correlation heatmap.")
        corr = df[numeric].corr().round(3)
        return px.imshow(corr, text_auto=True, color_continuous_scale="Viridis", title="Correlation heatmap")

    return get_best_chart(df)


def describe_recommendations(df):
    numeric = numeric_columns(df)
    categorical = categorical_columns(df)
    datetime_cols = [col for col in df.columns if pd.api.types.is_datetime64_any_dtype(df[col])]
    recs = []

    if not df.empty:
        recs.append("Auto best fit identifies the most relevant chart based on the dataset structure.")

    if datetime_cols and numeric:
        recs.append("A trend/line chart is best for time-based patterns and forecasting.")
    if len(numeric) >= 2:
        recs.append("A scatter plot is useful for identifying correlations and relationships between numeric features.")
    if numeric:
        recs.append("A histogram is helpful for observing the distribution and skewness of your numeric data.")
    if categorical:
        recs.append("Bar and pie charts work well for comparing categories and proportions.")
    if not recs:
        recs.append("Add more structured columns to unlock stronger recommendations.")

    return recs


def sample_records(df, limit=8):
    if df.empty:
        return []
    return json.loads(df.head(limit).to_json(orient="records", date_format="iso"))


def summarize_dataframe(df):
    numeric = numeric_columns(df)
    categorical = categorical_columns(df)
    summary = {
        "rows": int(len(df)),
        "columns": int(len(df.columns)),
        "numeric_fields": numeric,
        "category_fields": categorical,
        "recommendations": describe_recommendations(df),
        "sample": sample_records(df),
    }
    if numeric:
        summary["numeric_summary"] = df[numeric].describe().to_dict()
    return summary


def make_chart_payload(df, chart_type="Auto best fit"):
    fig = build_chart(df, chart_type)
    return {
        "chart_type": chart_type,
        "data": json.loads(fig.to_json())
    }


def build_backend_response(uploaded_file=None, chart_type="Auto best fit"):
    if uploaded_file is None:
        df = build_demo_data()
    else:
        df = load_uploaded_dataset(uploaded_file)

    fig = build_chart(df, chart_type)
    summary = summarize_dataframe(df)

    return {
        "success": True,
        "summary": summary,
        "chart": json.loads(fig.to_json()),
        "best_chart_type": chart_type,
        "available_chart_types": [
            "Auto best fit",
            "Bar chart",
            "Line chart",
            "Scatter plot",
            "Histogram",
            "Pie chart",
            "Correlation heatmap",
        ],
    }
