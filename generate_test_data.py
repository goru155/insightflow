"""Generate sample datasets for testing the InsightFlow upload feature."""

from pathlib import Path

from analytics_engine import build_demo_data

OUTPUT_DIR = Path(__file__).resolve().parent / "test-data"


def main():
    OUTPUT_DIR.mkdir(exist_ok=True)
    df = build_demo_data()

    csv_path = OUTPUT_DIR / "sample_sales.csv"
    json_path = OUTPUT_DIR / "sample_sales.json"
    xlsx_path = OUTPUT_DIR / "sample_sales.xlsx"

    df.to_csv(csv_path, index=False)
    df.to_json(json_path, orient="records", date_format="iso", indent=2)
    df.to_excel(xlsx_path, index=False)

    print(f"Created {csv_path} ({len(df)} rows)")
    print(f"Created {json_path}")
    print(f"Created {xlsx_path}")
    print("\nUpload any of these files in the React app to test the analyze flow.")


if __name__ == "__main__":
    main()
