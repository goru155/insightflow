# InsightFlow Analytics Dashboard

InsightFlow is a full-stack analytics application that turns uploaded datasets into chart recommendations, summaries, and interactive dashboard insights. It supports CSV, Excel, JSON, TXT, and PDF uploads, and automatically detects numeric and categorical fields to suggest the best visualization.

## Features

- Upload datasets in multiple formats: CSV, Excel, JSON, TXT, and PDF
- Automatic field detection for numeric and categorical columns
- Smart chart recommendations using dataset structure
- Interactive dashboard with Plotly visualizations
- Demo dataset support for quick testing
- FastAPI backend for analysis requests
- React frontend with a modern analytics UI
- Export chart previews and data samples

## Tech Stack

- Python 3.10+
- FastAPI
- Pandas, NumPy, Plotly
- React + Vite
- Lucide React icons

## Project Structure

```text
python_project/
├── analytics_engine.py        # Data cleaning, chart generation, recommendations
├── backend_api.py             # FastAPI backend endpoints
├── generate_test_data.py      # Utility to generate synthetic test data
├── requirements.txt           # Python dependencies
├── tests/
│   └── test_analytics_engine.py
├── react-landing/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── public/
│   │   └── test-data/
│   │       └── sample_sales.csv
│   └── src/
│       ├── App.jsx
│       ├── index.css
│       └── main.jsx
├── test-data/
│   ├── sample_sales.csv
│   └── sample_sales.json
└── README.md
```

## Backend API

The backend is powered by FastAPI and exposes the following routes:

- `GET /health` — checks API health
- `GET /demo` — loads demo analytics data
- `POST /analyze` — uploads a dataset and returns generated insights

### Example

```bash
uvicorn backend_api:app --reload --port 8000
```

Then open:

- http://localhost:8000/health
- http://localhost:8000/demo

## Frontend

The UI is built using React and Vite.

### Run the frontend

```bash
cd react-landing
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal, usually:

- http://localhost:5173

## Python Environment Setup

From the project root:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

On macOS/Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Running the App

### 1. Start the backend

```bash
uvicorn backend_api:app --reload --port 8000
```

### 2. Start the frontend

```bash
cd react-landing
npm install
npm run dev
```

## Demo Usage

- Open the UI in the browser
- Load the sample CSV or upload your own data file
- Choose a chart type from the dropdown
- View the generated analytics summary and chart recommendations
- Export the preview or download the chart as PNG, SVG, PDF, or HTML

## Testing

Run the Python test suite with:

```bash
pytest
```

## Notes

This project is designed for data exploration and quick business intelligence workflows. It helps users test dataset patterns, generate insights automatically, and visualize key metrics without building a custom reporting pipeline from scratch.

## License

This project is currently provided for educational and internal use. Add your preferred license here if you plan to publish it publicly.

## Author

Developed as a data analytics and dashboard prototype for exploring uploaded datasets and visual recommendations.
# insightflow
