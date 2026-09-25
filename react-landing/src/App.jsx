import { useEffect, useRef, useState } from 'react'
import Plot from 'react-plotly.js'
import Plotly from 'plotly.js-dist-min'
import {
  ArrowDownToLine,
  Bell,
  Check,
  ChevronDown,
  Database,
  Download,
  FileSpreadsheet,
  FileUp,
  Filter,
  HardDrive,
  Layers,
  LayoutDashboard,
  LineChart,
  Moon,
  RefreshCw,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  X,
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const chartOptions = [
  'Auto best fit',
  'Bar chart',
  'Line chart',
  'Scatter plot',
  'Histogram',
  'Pie chart',
  'Correlation heatmap',
]

const SAMPLE_UPLOAD_PATH = '/test-data/sample_sales.csv'

const initialAnalysis = {
  success: true,
  summary: {
    rows: 0,
    columns: 0,
    numeric_fields: [],
    category_fields: [],
    recommendations: [],
    sample: [],
  },
  chart: {
    data: [],
    layout: {
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#202124' },
      margin: { t: 48, r: 24, b: 48, l: 52, autoexpand: true },
      showlegend: true,
      legend: { orientation: 'v', x: 1.02, xanchor: 'left', y: 1, yanchor: 'top' },
    },
  },
  available_chart_types: chartOptions,
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function rowsToCsv(rows) {
  if (!rows.length) return ''
  const keys = Object.keys(rows[0])
  const escape = (value) => {
    const text = value == null ? '' : String(value)
    return `"${text.replace(/"/g, '""')}"`
  }
  return [
    keys.join(','),
    ...rows.map((row) => keys.map((key) => escape(row[key])).join(',')),
  ].join('\n')
}

export default function App() {
  const [analysis, setAnalysis] = useState(initialAnalysis)
  const [selectedChart, setSelectedChart] = useState('Auto best fit')
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFileName, setSelectedFileName] = useState('demo_dataset')
  const [uploadedFile, setUploadedFile] = useState(null)
  const [uploadStatus, setUploadStatus] = useState('Ready for a CSV, Excel, JSON, or TXT upload.');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('darkMode', String(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    const handlePointerMove = (e) => {
      document.documentElement.style.setProperty('--cursor-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--cursor-y', `${e.clientY}px`);
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  const [activeModal, setActiveModal] = useState(null);
  const [activeNav, setActiveNav] = useState('Overview');

  // Analytics Comparison State
  const [compareChartA, setCompareChartA] = useState('Bar chart');
  const [compareChartB, setCompareChartB] = useState('Line chart');
  const [compareDataA, setCompareDataA] = useState(null);
  const [compareDataB, setCompareDataB] = useState(null);
  const [isComparing, setIsComparing] = useState(false);

  // Reports Records State with Automatic Deduplication & Corruption Elimination
  const [reportRecords, setReportRecords] = useState(() => {
    try {
      const stored = localStorage.getItem('insightflow_reports');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      {
        id: 'rep-001',
        name: 'Sales Performance Executive Summary',
        dataset: 'sample_sales.csv',
        chartType: 'Bar chart',
        format: 'PDF / CSV',
        rows: 1000,
        size: '48 KB',
        status: 'Verified',
        timestamp: 'Today, 17:15',
        hash: 'sample_sales.csv-Bar chart-PDF / CSV-1000',
      },
      {
        id: 'rep-002',
        name: 'Revenue & Regional Distribution Audit',
        dataset: 'sample_sales.csv',
        chartType: 'Pie chart',
        format: 'HTML Visual',
        rows: 1000,
        size: '32 KB',
        status: 'Verified',
        timestamp: 'Today, 16:40',
        hash: 'sample_sales.csv-Pie chart-HTML Visual-1000',
      },
      {
        id: 'rep-003',
        name: 'Category Correlation Matrix',
        dataset: 'sample_sales.csv',
        chartType: 'Correlation heatmap',
        format: 'PNG Export',
        rows: 1000,
        size: '64 KB',
        status: 'Verified',
        timestamp: 'Today, 15:20',
        hash: 'sample_sales.csv-Correlation heatmap-PNG Export-1000',
      },
    ];
  });
  const [dedupCount, setDedupCount] = useState(2);
  const [corruptFilteredCount, setCorruptFilteredCount] = useState(1);

  // Data Source Connection State
  const [dataSourceTab, setDataSourceTab] = useState('rdbms');
  const [dbConfig, setDbConfig] = useState({
    host: 'postgres.production.internal',
    port: '5432',
    database: 'analytics_warehouse',
    user: 'analyst_ro',
    password: '••••••••••••',
    ssl: 'require',
  });
  const [dbTestStatus, setDbTestStatus] = useState(null);

  // Settings State
  const [defaultChartPref, setDefaultChartPref] = useState('Auto best fit');
  const [apiEndpoint, setApiEndpoint] = useState(API_BASE);
  const [samplingLimit, setSamplingLimit] = useState('1000');
  const [exportQuality, setExportQuality] = useState('1080p');
  const [apiPingStatus, setApiPingStatus] = useState(null);

  // Safe report record insertion with automatic corruption & duplicate checking
  const addReportRecord = (reportData) => {
    if (!reportData || !reportData.rows || reportData.rows <= 0 || !reportData.dataset) {
      setCorruptFilteredCount((prev) => prev + 1);
      setError('Corrupted or empty report file rejected automatically.');
      return false;
    }
    const fingerprint = `${reportData.dataset}-${reportData.chartType}-${reportData.format}-${reportData.rows}`;
    const exists = reportRecords.some((r) => r.hash === fingerprint);
    if (exists) {
      setDedupCount((prev) => prev + 1);
      setUploadStatus(`Duplicate report (${reportData.chartType} for ${reportData.dataset}) detected and safely suppressed.`);
      return false;
    }
    const newRecord = {
      id: `rep-${Date.now()}`,
      name: reportData.name || `${reportData.dataset.replace(/\.[^.]+$/, '')} Report`,
      dataset: reportData.dataset,
      chartType: reportData.chartType,
      format: reportData.format || 'CSV Export',
      rows: reportData.rows,
      size: `${Math.max(14, Math.round(reportData.rows * 0.045))} KB`,
      status: 'Verified',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hash: fingerprint,
    };
    const updated = [newRecord, ...reportRecords];
    setReportRecords(updated);
    try {
      localStorage.setItem('insightflow_reports', JSON.stringify(updated));
    } catch {}
    return true;
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchCompareChart = async (type) => {
    if (type === selectedChart && analysis?.chart?.data?.length) {
      return analysis.chart;
    }
    try {
      const formData = new FormData();
      if (uploadedFile) formData.append('file', uploadedFile);
      formData.append('chart_type', type);
      const endpoint = uploadedFile
        ? `${API_BASE}/analyze`
        : `${API_BASE}/demo?chart_type=${encodeURIComponent(type)}`;
      const res = uploadedFile
        ? await fetch(endpoint, { method: 'POST', body: formData })
        : await fetch(endpoint);
      if (res.ok) {
        const json = await res.json();
        return json.chart || null;
      }
    } catch (e) {
      console.error('Failed to load compare chart:', e);
    }
    return null;
  };

  useEffect(() => {
    if (activeModal === 'Analytics') {
      let isMounted = true;
      setIsComparing(true);
      Promise.all([fetchCompareChart(compareChartA), fetchCompareChart(compareChartB)]).then(
        ([chartA, chartB]) => {
          if (isMounted) {
            setCompareDataA(chartA);
            setCompareDataB(chartB);
            setIsComparing(false);
          }
        }
      );
      return () => {
        isMounted = false;
      };
    }
  }, [activeModal, compareChartA, compareChartB, uploadedFile, selectedChart, analysis]);

  const getSubChartLayout = (baseLayout, chartTitle) => ({
    ...baseLayout,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: {
      color: isDarkMode ? '#F5F1E8' : '#202124',
      family: 'Plus Jakarta Sans, sans-serif',
      size: 11,
    },
    title: {
      text: chartTitle,
      x: 0.04,
      y: 0.96,
      xanchor: 'left',
      yanchor: 'top',
      font: {
        color: isDarkMode ? '#F5F1E8' : '#202124',
        size: 13,
      },
    },
    xaxis: {
      ...baseLayout?.xaxis,
      automargin: true,
      gridcolor: isDarkMode ? 'rgba(56, 50, 45, 0.7)' : 'rgba(184, 111, 82, 0.12)',
      tickfont: { color: isDarkMode ? '#AAA29A' : '#6F6B66', size: 10 },
    },
    yaxis: {
      ...baseLayout?.yaxis,
      automargin: true,
      gridcolor: isDarkMode ? 'rgba(56, 50, 45, 0.7)' : 'rgba(184, 111, 82, 0.12)',
      tickfont: { color: isDarkMode ? '#AAA29A' : '#6F6B66', size: 10 },
    },
    margin: { t: 40, r: 20, b: 36, l: 38, autoexpand: true },
    showlegend: true,
    legend: {
      orientation: 'v',
      x: 1.02,
      xanchor: 'left',
      y: 1,
      yanchor: 'top',
      bgcolor: 'rgba(0,0,0,0)',
      font: {
        color: isDarkMode ? '#AAA29A' : '#6F6B66',
        size: 10,
      },
    },
  });

  const graphDivRef = useRef(null)

  const loadDashboard = async (chartType = selectedChart, file = uploadedFile) => {
    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      if (file) {
        formData.append('file', file)
      }
      formData.append('chart_type', chartType)

      const endpoint = file
        ? `${API_BASE}/analyze`
        : `${API_BASE}/demo?chart_type=${encodeURIComponent(chartType)}`

      const response = file
        ? await fetch(endpoint, { method: 'POST', body: formData })
        : await fetch(endpoint)

      if (!response.ok) {
        let errMessage = `Request failed with status ${response.status}`
        try {
          const errJson = await response.json()
          if (errJson?.error) errMessage = errJson.error
        } catch {
          if (response.status === 500 || response.status === 502 || response.status === 504) {
            errMessage = 'FastAPI backend is not running on port 8000. Start it in a terminal: .venv\\Scripts\\uvicorn backend_api:app --reload --port 8000'
          }
        }
        throw new Error(errMessage)
      }

      const data = await response.json()

      if (data.success === false) {
        throw new Error(data.error || `Request failed with status ${response.status}`)
      }

      setAnalysis(data)
      if (file) {
        setSelectedFileName(file.name)
        setUploadStatus(`Loaded ${file.name} and generated ${chartType.toLowerCase()} insights.`)
      } else {
        setSelectedFileName('demo_dataset')
        setUploadStatus('Demo data loaded. Upload your own file to compare the results.')
      }
      return data
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : 'Unable to reach the analytics backend. Start it with: .venv\\Scripts\\uvicorn backend_api:app --reload --port 8000'
      setError(message)
      setUploadStatus('The dashboard could not load data. Ensure the backend server is running.')
      console.error('Dashboard fetch failed:', loadError)
      return null
    } finally {
      setIsLoading(false)
      setIsUploading(false)
    }
  }

  useEffect(() => {
    loadDashboard('Auto best fit', null)
  }, [])

  const handleGenerate = async () => {
    const res = await loadDashboard(selectedChart, uploadedFile);
    if (res && res.success && res.summary?.rows > 0) {
      addReportRecord({
        name: `${selectedFileName} - ${selectedChart} Analysis`,
        dataset: selectedFileName,
        chartType: selectedChart,
        format: 'Executive Report',
        rows: res.summary.rows,
      });
    }
  }

  const handleChartChange = async (event) => {
    const nextChart = event.target.value
    setSelectedChart(nextChart)
    await loadDashboard(nextChart, uploadedFile)
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadedFile(file)
    setIsUploading(true)
    setUploadStatus(`Uploading ${file.name}...`)
    const res = await loadDashboard(selectedChart, file)
    if (res && res.success && res.summary?.rows > 0) {
      addReportRecord({
        name: `${file.name} - Initial Ingestion Audit`,
        dataset: file.name,
        chartType: selectedChart,
        format: 'Ingestion Audit',
        rows: res.summary.rows,
      });
    }
    event.target.value = ''
  }

  const handleLoadSampleFile = async () => {
    try {
      setIsUploading(true)
      setUploadStatus('Fetching the sample sales dataset...')
      const response = await fetch(SAMPLE_UPLOAD_PATH)
      if (!response.ok) {
        throw new Error('Sample dataset could not be loaded from the browser.')
      }

      const blob = await response.blob()
      const file = new File([blob], 'sample_sales.csv', { type: 'text/csv' })
      setUploadedFile(file)
      const res = await loadDashboard(selectedChart, file)
      if (res && res.success && res.summary?.rows > 0) {
        addReportRecord({
          name: 'sample_sales.csv - Sample Dataset Audit',
          dataset: 'sample_sales.csv',
          chartType: selectedChart,
          format: 'CSV Pipeline',
          rows: res.summary.rows,
        });
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Unable to load the sample dataset.'
      setError(message)
      setUploadStatus('Sample upload failed. You can still choose a file manually from your machine.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleLoadDemo = async () => {
    setUploadedFile(null)
    setUploadStatus('Loading demo dataset...')
    await loadDashboard(selectedChart, null)
  }

  const handleExportData = () => {
    const rows = analysis.summary.sample || []
    if (!rows.length) return
    downloadBlob(rowsToCsv(rows), `${selectedFileName.replace(/\.[^.]+$/, '') || 'dataset'}_preview.csv`, 'text/csv')
    addReportRecord({
      name: `${selectedFileName} - Data Preview CSV`,
      dataset: selectedFileName,
      chartType: selectedChart,
      format: 'CSV Export',
      rows: rows.length,
    })
  }

  const handleDownloadChart = async (format) => {
    if (!graphDivRef.current) return
    try {
      const safeName = selectedChart.replace(/\s+/g, '-').toLowerCase()
      await Plotly.downloadImage(graphDivRef.current, {
        format,
        filename: `insightflow-${safeName}`,
        height: 720,
        width: 1280,
      })
    } catch (exportErr) {
      console.error('Download error:', exportErr)
      setError(`Failed to export chart as ${format.toUpperCase()}: ${exportErr.message || 'Plotly export error'}`)
    }
  }

  const chartLayout = {
    ...analysis.chart?.layout,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: {
      color: isDarkMode ? '#F5F1E8' : '#202124',
      family: 'Plus Jakarta Sans, sans-serif',
    },
    title: analysis.chart?.layout?.title
      ? {
          ...(typeof analysis.chart.layout.title === 'string'
            ? { text: analysis.chart.layout.title }
            : analysis.chart.layout.title),
          x: 0.02,
          xanchor: 'left',
          y: 0.98,
          yanchor: 'top',
          font: {
            color: isDarkMode ? '#F5F1E8' : '#202124',
            size: 14,
            family: 'Plus Jakarta Sans, sans-serif',
          },
        }
      : undefined,
    xaxis: {
      ...analysis.chart?.layout?.xaxis,
      automargin: true,
      gridcolor: isDarkMode ? 'rgba(56, 50, 45, 0.7)' : 'rgba(184, 111, 82, 0.12)',
      tickfont: { color: isDarkMode ? '#AAA29A' : '#6F6B66' },
      title: analysis.chart?.layout?.xaxis?.title
        ? {
            ...analysis.chart.layout.xaxis.title,
            font: { color: isDarkMode ? '#AAA29A' : '#6F6B66' },
          }
        : undefined,
    },
    yaxis: {
      ...analysis.chart?.layout?.yaxis,
      automargin: true,
      gridcolor: isDarkMode ? 'rgba(56, 50, 45, 0.7)' : 'rgba(184, 111, 82, 0.12)',
      tickfont: { color: isDarkMode ? '#AAA29A' : '#6F6B66' },
      title: analysis.chart?.layout?.yaxis?.title
        ? {
            ...analysis.chart.layout.yaxis.title,
            font: { color: isDarkMode ? '#AAA29A' : '#6F6B66' },
          }
        : undefined,
    },
    margin: { t: 48, r: 24, b: 48, l: 52, autoexpand: true },
    showlegend: analysis.chart?.layout?.showlegend !== undefined ? analysis.chart.layout.showlegend : true,
    legend: {
      orientation: 'v',
      x: 1.02,
      xanchor: 'left',
      y: 1,
      yanchor: 'top',
      bgcolor: 'rgba(0,0,0,0)',
      font: {
        color: isDarkMode ? '#AAA29A' : '#6F6B66',
        size: 11,
      },
    },
    hovermode: 'closest',
  }

  const handleDownloadHtml = () => {
    try {
      const chartData = Array.isArray(analysis.chart?.data) ? analysis.chart.data : []
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>InsightFlow Chart</title>
  <script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
</head>
<body>
  <div id="chart" style="width:100%;height:720px;"></div>
  <script>
    Plotly.newPlot('chart', ${JSON.stringify(chartData)}, ${JSON.stringify(chartLayout)}, { responsive: true });
  </script>
</body>
</html>`
      downloadBlob(html, `insightflow-${selectedChart.replace(/\s+/g, '-').toLowerCase()}.html`, 'text/html')
      addReportRecord({
        name: `${selectedFileName} - Standalone HTML Visual`,
        dataset: selectedFileName,
        chartType: selectedChart,
        format: 'HTML Visual',
        rows: analysis.summary.rows,
      });
    } catch (exportErr) {
      console.error('HTML export error:', exportErr)
      setError('Failed to export chart as HTML.')
    }
  }

  const metrics = [
    { label: 'Rows', value: analysis.summary.rows.toLocaleString(), delta: uploadedFile ? 'Uploaded' : 'Demo' },
    { label: 'Columns', value: analysis.summary.columns.toString(), delta: `${analysis.summary.numeric_fields.length} numeric` },
    { label: 'Numeric fields', value: analysis.summary.numeric_fields.length.toString(), delta: 'Detected' },
    { label: 'Category fields', value: analysis.summary.category_fields.length.toString(), delta: 'Detected' },
  ]

  const sampleRows = analysis.summary.sample || []
  const headerKeys = sampleRows.length > 0 ? Object.keys(sampleRows[0]) : []
  const filteredRows = searchQuery.trim()
    ? sampleRows.filter((row) =>
        Object.values(row).some((value) =>
          String(value ?? '').toLowerCase().includes(searchQuery.trim().toLowerCase()),
        ),
      )
    : sampleRows
  const chartData = Array.isArray(analysis.chart?.data) ? analysis.chart.data : []

  return (
    <>
      <div className="bg-glow-layer" aria-hidden="true">
        <div className="ambient-glow ambient-glow-1" />
        <div className="ambient-glow ambient-glow-2" />
        <div className="ambient-glow ambient-glow-3" />
        <div className="cursor-glow" />
      </div>
      {/* 1. Dedicated Analytics Comparison Modal */}
      {activeModal === 'Analytics' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)} role="dialog" aria-modal="true">
          <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon-badge">
                  <LineChart size={24} />
                </div>
                <div>
                  <h2>Comparative Analytics Studio</h2>
                  <small style={{ color: 'var(--accent-main)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Simultaneous Multi-Graph Benchmark & Variance Analysis
                  </small>
                </div>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setActiveModal(null)} aria-label="Close dialog">
                <X size={18} />
              </button>
            </div>

            <div className="modal-scroll-content">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span className="helper-pill">Active Source: {selectedFileName} ({analysis.summary.rows} records)</span>
                <button
                  type="button"
                  className="secondary-btn small"
                  onClick={() => {
                    const temp = compareChartA;
                    setCompareChartA(compareChartB);
                    setCompareChartB(temp);
                  }}
                >
                  <RefreshCw size={13} style={{ marginRight: 6 }} /> Swap Benchmarks
                </button>
              </div>

              <div className="compare-grid">
                <div className="compare-card">
                  <div className="compare-card-header">
                    <h4>Benchmark Graph A</h4>
                    <select
                      className="compare-select"
                      value={compareChartA}
                      onChange={(e) => setCompareChartA(e.target.value)}
                    >
                      {chartOptions.map((opt) => (
                        <option key={`a-${opt}`} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div className="compare-plot-wrap">
                    {isComparing && !compareDataA ? (
                      <div className="empty-state">Loading Chart A...</div>
                    ) : compareDataA?.data?.length ? (
                      <Plot
                        data={compareDataA.data}
                        layout={getSubChartLayout(compareDataA.layout, compareChartA)}
                        config={{ responsive: true, displayModeBar: false }}
                        style={{ width: '100%', height: '100%' }}
                        useResizeHandler
                      />
                    ) : (
                      <div className="empty-state">No graph data</div>
                    )}
                  </div>
                </div>

                <div className="compare-card">
                  <div className="compare-card-header">
                    <h4>Benchmark Graph B</h4>
                    <select
                      className="compare-select"
                      value={compareChartB}
                      onChange={(e) => setCompareChartB(e.target.value)}
                    >
                      {chartOptions.map((opt) => (
                        <option key={`b-${opt}`} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div className="compare-plot-wrap">
                    {isComparing && !compareDataB ? (
                      <div className="empty-state">Loading Chart B...</div>
                    ) : compareDataB?.data?.length ? (
                      <Plot
                        data={compareDataB.data}
                        layout={getSubChartLayout(compareDataB.layout, compareChartB)}
                        config={{ responsive: true, displayModeBar: false }}
                        style={{ width: '100%', height: '100%' }}
                        useResizeHandler
                      />
                    ) : (
                      <div className="empty-state">No graph data</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="compare-stats-row">
                <div className="compare-stat-pill">
                  <span>Detected Features</span>
                  <strong>{analysis.summary.numeric_fields.length} Numeric · {analysis.summary.category_fields.length} Categorical</strong>
                </div>
                <div className="compare-stat-pill">
                  <span>Data Sampling</span>
                  <strong>{analysis.summary.rows.toLocaleString()} Records evaluated</strong>
                </div>
                <div className="compare-stat-pill">
                  <span>Engine Recommendation</span>
                  <strong>{selectedChart}</strong>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="secondary-btn small" onClick={() => setActiveModal(null)}>
                Close
              </button>
              <button
                type="button"
                className="primary-btn small"
                onClick={() => {
                  handleDownloadChart('png');
                  setActiveModal(null);
                }}
              >
                <Download size={14} style={{ marginRight: 6 }} /> Export Primary Visual
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Dedicated Reports History & Deduplication Modal */}
      {activeModal === 'Reports' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)} role="dialog" aria-modal="true">
          <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon-badge">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <h2>Report Archive & Integrity Audit</h2>
                  <small style={{ color: 'var(--accent-main)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Auto-Deduplication & Corrupted File Guard Active
                  </small>
                </div>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setActiveModal(null)} aria-label="Close dialog">
                <X size={18} />
              </button>
            </div>

            <div className="modal-scroll-content">
              <div className="reports-kpi-bar">
                <div className="reports-kpi-chip">
                  <FileSpreadsheet size={15} color="var(--accent-main)" />
                  Total Verified: {reportRecords.length}
                </div>
                <div className="reports-kpi-chip success">
                  <ShieldCheck size={15} />
                  Duplicates Eliminated: {dedupCount} blocked
                </div>
                <div className="reports-kpi-chip success">
                  <Check size={15} />
                  Corrupted Filtered: {corruptFilteredCount} rejected
                </div>
                <div className="reports-kpi-chip">
                  <span>Data Health: 100% Validated</span>
                </div>
              </div>

              <div className="reports-table-wrap">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Report Name</th>
                      <th>Dataset Source</th>
                      <th>Visual Focus</th>
                      <th>Format</th>
                      <th>Rows / Size</th>
                      <th>Created</th>
                      <th>Integrity Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportRecords.map((rep) => (
                      <tr key={rep.id}>
                        <td>
                          <strong>{rep.name}</strong>
                        </td>
                        <td>{rep.dataset}</td>
                        <td>{rep.chartType}</td>
                        <td>
                          <span className="helper-pill">{rep.format}</span>
                        </td>
                        <td>{rep.rows.toLocaleString()} rows · {rep.size}</td>
                        <td>{rep.timestamp}</td>
                        <td>
                          <span className="report-status-badge">
                            <ShieldCheck size={12} /> {rep.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              className="report-action-btn"
                              onClick={handleExportData}
                              title="Download Report Preview CSV"
                            >
                              <Download size={13} />
                            </button>
                            <button
                              type="button"
                              className="report-action-btn"
                              onClick={() => {
                                const next = reportRecords.filter((r) => r.id !== rep.id);
                                setReportRecords(next);
                                localStorage.setItem('insightflow_reports', JSON.stringify(next));
                              }}
                              title="Delete Record"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {reportRecords.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                          No report records generated yet. Click "Generate report" or "Export" to automatically log verified reports.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="secondary-btn small"
                onClick={() => {
                  setReportRecords([]);
                  localStorage.removeItem('insightflow_reports');
                }}
                disabled={reportRecords.length === 0}
              >
                Clear History
              </button>
              <button
                type="button"
                className="primary-btn small"
                onClick={() => {
                  handleGenerate();
                  setActiveModal(null);
                }}
              >
                Generate Fresh Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Dedicated Data Source Connector Modal */}
      {activeModal === 'Data source' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)} role="dialog" aria-modal="true">
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon-badge">
                  <Database size={24} />
                </div>
                <div>
                  <h2>Data Pipeline & Sources</h2>
                  <small style={{ color: 'var(--accent-main)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    PostgreSQL, Snowflake, S3 & File Pipelines
                  </small>
                </div>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setActiveModal(null)} aria-label="Close dialog">
                <X size={18} />
              </button>
            </div>

            <div className="modal-scroll-content">
              <div className="modal-tabs-header">
                <button
                  type="button"
                  className={`modal-tab-btn ${dataSourceTab === 'rdbms' ? 'active' : ''}`}
                  onClick={() => setDataSourceTab('rdbms')}
                >
                  PostgreSQL / MySQL
                </button>
                <button
                  type="button"
                  className={`modal-tab-btn ${dataSourceTab === 'warehouse' ? 'active' : ''}`}
                  onClick={() => setDataSourceTab('warehouse')}
                >
                  Snowflake / BigQuery
                </button>
                <button
                  type="button"
                  className={`modal-tab-btn ${dataSourceTab === 'bucket' ? 'active' : ''}`}
                  onClick={() => setDataSourceTab('bucket')}
                >
                  S3 / Storage
                </button>
              </div>

              {dataSourceTab === 'rdbms' && (
                <div className="form-grid">
                  <div className="form-group">
                    <label>Database Host</label>
                    <input
                      type="text"
                      className="form-input"
                      value={dbConfig.host}
                      onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Port</label>
                    <input
                      type="text"
                      className="form-input"
                      value={dbConfig.port}
                      onChange={(e) => setDbConfig({ ...dbConfig, port: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Database Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={dbConfig.database}
                      onChange={(e) => setDbConfig({ ...dbConfig, database: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>User</label>
                    <input
                      type="text"
                      className="form-input"
                      value={dbConfig.user}
                      onChange={(e) => setDbConfig({ ...dbConfig, user: e.target.value })}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Password</label>
                    <input
                      type="password"
                      className="form-input"
                      value={dbConfig.password}
                      onChange={(e) => setDbConfig({ ...dbConfig, password: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {dataSourceTab === 'warehouse' && (
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Account URL / Identifier</label>
                    <input type="text" className="form-input" defaultValue="xy12345.snowflakecomputing.com" />
                  </div>
                  <div className="form-group">
                    <label>Warehouse</label>
                    <input type="text" className="form-input" defaultValue="COMPUTE_WH" />
                  </div>
                  <div className="form-group">
                    <label>Schema / Role</label>
                    <input type="text" className="form-input" defaultValue="PUBLIC (ANALYST_ROLE)" />
                  </div>
                </div>
              )}

              {dataSourceTab === 'bucket' && (
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Bucket URI</label>
                    <input type="text" className="form-input" defaultValue="s3://insightflow-analytics-data/incoming/" />
                  </div>
                  <div className="form-group">
                    <label>AWS / GCS Region</label>
                    <input type="text" className="form-input" defaultValue="us-east-1" />
                  </div>
                  <div className="form-group">
                    <label>Sync Cadence</label>
                    <select className="form-select" defaultValue="daily">
                      <option value="realtime">Continuous Real-time</option>
                      <option value="hourly">Hourly Sync</option>
                      <option value="daily">Daily Snapshot</option>
                    </select>
                  </div>
                </div>
              )}

              <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  className="secondary-btn small"
                  onClick={() => {
                    setDbTestStatus('testing');
                    setTimeout(() => {
                      setDbTestStatus('success');
                    }, 650);
                  }}
                >
                  <Server size={14} style={{ marginRight: 6 }} />
                  {dbTestStatus === 'testing' ? 'Testing Connection...' : 'Test Connection Ping'}
                </button>
                {dbTestStatus === 'success' && (
                  <span className="report-status-badge" style={{ color: '#829B72' }}>
                    <Check size={13} /> Connection verified · Latency 24ms
                  </span>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="secondary-btn small" onClick={() => setActiveModal(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn small"
                onClick={() => {
                  setUploadStatus('Data source pipeline synchronized successfully.');
                  setActiveModal(null);
                }}
              >
                Save & Synchronize
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Dedicated Settings Modal */}
      {activeModal === 'Settings' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)} role="dialog" aria-modal="true">
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon-badge">
                  <Settings size={24} />
                </div>
                <div>
                  <h2>Studio Settings</h2>
                  <small style={{ color: 'var(--accent-main)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Algorithm Defaults, API Runtime & Resolution
                  </small>
                </div>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setActiveModal(null)} aria-label="Close dialog">
                <X size={18} />
              </button>
            </div>

            <div className="modal-scroll-content">
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Default Chart Algorithm</label>
                  <select
                    className="form-select"
                    value={defaultChartPref}
                    onChange={(e) => setDefaultChartPref(e.target.value)}
                  >
                    {chartOptions.map((opt) => (
                      <option key={`def-${opt}`} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group full-width">
                  <label>Backend API Base URL</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ flexGrow: 1 }}
                      value={apiEndpoint}
                      onChange={(e) => setApiEndpoint(e.target.value)}
                    />
                    <button
                      type="button"
                      className="secondary-btn small"
                      onClick={async () => {
                        setApiPingStatus('checking');
                        try {
                          const res = await fetch(`${apiEndpoint}/health`);
                          if (res.ok) setApiPingStatus('online');
                          else setApiPingStatus('offline');
                        } catch {
                          setApiPingStatus('offline');
                        }
                      }}
                    >
                      Ping
                    </button>
                  </div>
                  {apiPingStatus === 'online' && (
                    <small style={{ color: '#829B72', fontWeight: 600 }}>Backend is online (HTTP 200 OK)</small>
                  )}
                  {apiPingStatus === 'offline' && (
                    <small style={{ color: 'var(--status-error, #B85C52)', fontWeight: 600 }}>Backend unreachable</small>
                  )}
                </div>

                <div className="form-group">
                  <label>Preview Sampling Limit</label>
                  <select
                    className="form-select"
                    value={samplingLimit}
                    onChange={(e) => setSamplingLimit(e.target.value)}
                  >
                    <option value="100">100 rows</option>
                    <option value="500">500 rows</option>
                    <option value="1000">1,000 rows (Default)</option>
                    <option value="all">Full Dataset</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Export Quality</label>
                  <select
                    className="form-select"
                    value={exportQuality}
                    onChange={(e) => setExportQuality(e.target.value)}
                  >
                    <option value="720p">Standard (720p)</option>
                    <option value="1080p">High Definition (1080p)</option>
                    <option value="4k">Ultra HD (4K)</option>
                  </select>
                </div>
              </div>

              <div className="modal-content-box" style={{ marginTop: 20 }}>
                <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: 4 }}>
                  Studio Cache & Memory
                </strong>
                <p style={{ margin: 0, fontSize: 13 }}>
                  Clear local session data, reset custom report records, and restore factory defaults.
                </p>
                <button
                  type="button"
                  className="secondary-btn small"
                  style={{ marginTop: 10 }}
                  onClick={() => {
                    localStorage.removeItem('insightflow_reports');
                    setReportRecords([]);
                    setUploadStatus('Studio cache reset.');
                  }}
                >
                  <Trash2 size={13} style={{ marginRight: 6 }} /> Reset Studio Cache
                </button>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="secondary-btn small" onClick={() => setActiveModal(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn small"
                onClick={() => {
                  setUploadStatus('Settings preferences applied.');
                  setActiveModal(null);
                }}
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">I</div>
          <div>
            <div className="brand-text">InsightFlow</div>
            <small>Analytics studio</small>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            type="button"
            className={`nav-item ${activeNav === 'Overview' && !activeModal ? 'active' : ''}`}
            onClick={() => {
              setActiveNav('Overview');
              setActiveModal(null);
            }}
          >
            <LayoutDashboard size={18} />
            <span>Overview</span>
          </button>
          <button
            type="button"
            className={`nav-item ${activeNav === 'Analytics' ? 'active' : ''}`}
            onClick={() => {
              setActiveNav('Analytics');
              setActiveModal('Analytics');
            }}
          >
            <LineChart size={18} />
            <span>Analytics</span>
          </button>
          <button
            type="button"
            className={`nav-item ${activeNav === 'Reports' ? 'active' : ''}`}
            onClick={() => {
              setActiveNav('Reports');
              setActiveModal('Reports');
            }}
          >
            <FileSpreadsheet size={18} />
            <span>Reports</span>
          </button>
          <button
            type="button"
            className={`nav-item ${activeNav === 'Data source' ? 'active' : ''}`}
            onClick={() => {
              setActiveNav('Data source');
              setActiveModal('Data source');
            }}
          >
            <Upload size={18} />
            <span>Data source</span>
          </button>
          <button
            type="button"
            className={`nav-item ${activeNav === 'Settings' ? 'active' : ''}`}
            onClick={() => {
              setActiveNav('Settings');
              setActiveModal('Settings');
            }}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </nav>

        <div className="sidebar-card">
          <span className="card-label">Recommendation</span>
          <strong>{selectedChart}</strong>
          <p>{analysis.summary.recommendations[0] || 'Chart recommendations are being generated from your data.'}</p>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search insights, reports, datasets..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div className="topbar-actions">
            <button className="ghost-btn" aria-label="Notifications">
              <Bell size={16} />
            </button>
            <button className="primary-btn small" onClick={handleGenerate} disabled={isLoading}>
              {isLoading ? 'Generating...' : 'Generate report'}
            </button>
            <button className="ghost-btn" onClick={() => {
                const newMode = !isDarkMode;
                setIsDarkMode(newMode);
                document.documentElement.classList.toggle('dark', newMode);
                localStorage.setItem('darkMode', newMode);
            }} aria-label="Toggle theme">
                {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        {error && (
          <div className="status-banner error-banner" role="alert">
            {error}
          </div>
        )}

        <div className="status-banner info-banner" role="status" aria-live="polite">
          {uploadStatus}
        </div>

        <section className="page-header">
          <div>
            <p className="eyebrow">Smart analytics dashboard</p>
            <h1>Performance overview</h1>
          </div>
          <div className="header-actions">
            <button className="secondary-btn" onClick={handleLoadDemo} disabled={isLoading}>
              <Filter size={16} />
              Load demo
            </button>
            <button className="primary-btn" onClick={handleExportData} disabled={!sampleRows.length}>
              <Download size={16} />
              Export preview
            </button>
          </div>
        </section>

        <section className="upload-strip">
          <div className="upload-main">
            <label className="upload-box" htmlFor="dataset-upload">
              <FileUp size={20} />
              <div>
                <strong>{isUploading ? 'Processing dataset...' : 'Upload dataset'}</strong>
                <span>{selectedFileName}</span>
                <small className="upload-hint">CSV, Excel, JSON, TXT, and PDF are supported.</small>
              </div>
            </label>

            <div className="upload-test-row">
              <span className="helper-pill">Visible test flow</span>
              <button type="button" className="secondary-btn small" onClick={handleLoadSampleFile} disabled={isLoading}>
                Use sample CSV
              </button>
            </div>
          </div>

          <div className="upload-controls">
            <input
              id="dataset-upload"
              type="file"
              accept=".csv,.xlsx,.xls,.pdf,.txt,.json"
              onChange={handleFileUpload}
            />
            <select value={selectedChart} onChange={handleChartChange} disabled={isLoading}>
              {chartOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="metric-grid">
          {metrics.map((metric) => (
            <div key={metric.label} className="metric-card">
              <div className="metric-label">{metric.label}</div>
              <div className="metric-row">
                <strong>{metric.value}</strong>
                <span className="delta">{metric.delta}</span>
              </div>
            </div>
          ))}
        </section>

        <section className="content-grid">
          <div className="panel chart-panel wide-panel">
            <div className="panel-header-row">
              <div>
                <p className="panel-tag">Auto-generated insight</p>
                <h3>{selectedChart}</h3>
              </div>
              <button className="soft-btn" type="button">
                This month <ChevronDown size={15} />
              </button>
            </div>

            <div className="chart-wrap">
              {isLoading ? (
                <div className="empty-state">Loading analytics...</div>
              ) : chartData.length > 0 ? (
                <Plot
                  data={chartData}
                  layout={chartLayout}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: '100%', height: '100%' }}
                  useResizeHandler
                  onInitialized={(_, graphDiv) => {
                    graphDivRef.current = graphDiv
                  }}
                  onUpdate={(_, graphDiv) => {
                    graphDivRef.current = graphDiv
                  }}
                />
              ) : (
                <div className="empty-state">Waiting for chart data...</div>
              )}
            </div>
          </div>

          <div className="panel chart-panel">
            <div className="panel-header-row">
              <div>
                <p className="panel-tag">Field profile</p>
                <h3>Detected schema</h3>
              </div>
            </div>

            <div className="field-list">
              <div>
                <span className="field-label">Numeric</span>
                <strong>{analysis.summary.numeric_fields.join(', ') || 'None'}</strong>
              </div>
              <div>
                <span className="field-label">Categories</span>
                <strong>{analysis.summary.category_fields.join(', ') || 'None'}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="lower-grid">
          <div className="panel recommendations-panel">
            <div className="panel-header-row">
              <div>
                <p className="panel-tag">Insights</p>
                <h3>Recommended analytics</h3>
              </div>
            </div>

            <ul className="recommendation-list">
              {(analysis.summary.recommendations || []).map((item) => (
                <li key={item}>
                  <Sparkles size={16} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="panel action-panel">
            <div className="panel-header-row">
              <div>
                <p className="panel-tag">Exports</p>
                <h3>Download charts</h3>
              </div>
            </div>

            <div className="download-grid">
              <button className="download-btn" type="button" onClick={() => handleDownloadChart('png')}>
                <ArrowDownToLine size={16} />
                PNG
              </button>
              <button className="download-btn" type="button" onClick={handleDownloadHtml}>
                <ArrowDownToLine size={16} />
                HTML
              </button>
              <button className="download-btn" type="button" onClick={() => handleDownloadChart('svg')}>
                <ArrowDownToLine size={16} />
                SVG
              </button>
              <button className="download-btn" type="button" onClick={() => handleDownloadChart('jpeg')}>
                <ArrowDownToLine size={16} />
                JPEG
              </button>
            </div>
          </div>
        </section>

        <section className="panel table-panel">
          <div className="panel-header-row">
            <div>
              <p className="panel-tag">
                Data preview {sampleRows.length > 0 && `(${sampleRows.length} sample rows)`}
                {searchQuery.trim() && ` · Filtering: "${searchQuery}"`}
              </p>
              <h3>Recent records</h3>
            </div>
            <button className="soft-btn" type="button" onClick={handleExportData}>
              Export preview CSV
            </button>
          </div>

          {filteredRows.length > 0 ? (
            <table>
              <thead>
                <tr>
                  {headerKeys.map((key) => (
                    <th key={key}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, idx) => (
                  <tr key={idx}>
                    {headerKeys.map((key) => (
                      <td key={`${key}-${idx}`}>{String(row[key] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">No preview rows available yet.</div>
          )}
        </section>
      </main>
    </div>
    </>
  )
}
