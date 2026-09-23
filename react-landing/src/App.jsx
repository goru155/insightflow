import { useEffect, useRef, useState } from 'react'
import Plot from 'react-plotly.js'
import Plotly from 'plotly.js-dist-min'
import {
  ArrowDownToLine,
  Bell,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileUp,
  Filter,
  LayoutDashboard,
  LineChart,
  Search,
  Settings,
  Sparkles,
  Upload,
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
      plot_bgcolor: 'rgba(11,18,32,0.8)',
      font: { color: '#e2e8f0' },
      margin: { t: 32, r: 20, b: 40, l: 42 },
      showlegend: true,
      legend: { orientation: 'h', y: 1.12 },
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
  const [uploadStatus, setUploadStatus] = useState('Ready for a CSV, Excel, JSON, or TXT upload.')
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

      const data = await response.json()

      if (!response.ok || data.success === false) {
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
          : 'Unable to reach the analytics backend. Start it with: uvicorn backend_api:app --reload --port 8000'
      setError(message)
      setUploadStatus('The file could not be processed. Check the backend and try the sample file again.')
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
    await loadDashboard(selectedChart, uploadedFile)
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
    await loadDashboard(selectedChart, file)
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
      await loadDashboard(selectedChart, file)
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
  }

  const handleDownloadChart = async (format) => {
    if (!graphDivRef.current) return
    const safeName = selectedChart.replace(/\s+/g, '-').toLowerCase()
    await Plotly.downloadImage(graphDivRef.current, {
      format,
      filename: `insightflow-${safeName}`,
      height: 720,
      width: 1280,
    })
  }

  const handleDownloadHtml = () => {
    const chartData = Array.isArray(analysis.chart?.data) ? analysis.chart.data : []
    const chartLayout = analysis.chart?.layout || {}
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
  const chartLayout = {
    ...analysis.chart?.layout,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(11,18,32,0.8)',
    font: { color: '#e2e8f0' },
    margin: { t: 32, r: 20, b: 48, l: 42 },
    legend: { orientation: 'h', y: 1.12, x: 0 },
    hovermode: 'closest',
  }

  return (
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
          <div className="nav-item active">
            <LayoutDashboard size={18} />
            <span>Overview</span>
          </div>
          <div className="nav-item">
            <LineChart size={18} />
            <span>Analytics</span>
          </div>
          <div className="nav-item">
            <FileSpreadsheet size={18} />
            <span>Reports</span>
          </div>
          <div className="nav-item">
            <Upload size={18} />
            <span>Data source</span>
          </div>
          <div className="nav-item">
            <Settings size={18} />
            <span>Settings</span>
          </div>
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
            <div className="avatar">AC</div>
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
              <button className="download-btn" type="button" onClick={() => handleDownloadChart('pdf')}>
                <ArrowDownToLine size={16} />
                PDF
              </button>
            </div>
          </div>
        </section>

        <section className="panel table-panel">
          <div className="panel-header-row">
            <div>
              <p className="panel-tag">Data preview</p>
              <h3>Recent records</h3>
            </div>
            <button className="soft-btn" type="button" onClick={handleExportData}>
              Export CSV
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
  )
}
