import { BatchAutoIngestResponse, BatchImportSummary, BatchRowItem } from '../services/api';

/**
 * Escapes values for RFC 4180 CSV standard
 */
function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Escapes values for XML/XLSX
 */
function escapeXml(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Converts a UTC or ISO timestamp string into IST (Asia/Kolkata) formatted string:
 * e.g. "2026-09-08 19:26:03 UTC" -> "2026-09-09 00:56:03 IST"
 */
export function formatToIST(timestampStr?: string | null): string {
  if (!timestampStr) return '';
  try {
    let parseable = timestampStr.trim();
    if (parseable.endsWith(' UTC')) {
      parseable = parseable.replace(' UTC', 'Z').replace(' ', 'T');
    }
    const d = new Date(parseable);
    if (isNaN(d.getTime())) {
      return timestampStr;
    }

    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(d);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '00';
    const year = getPart('year');
    const month = getPart('month');
    const day = getPart('day');
    const hour = getPart('hour');
    const minute = getPart('minute');
    const second = getPart('second');

    return `${year}-${month}-${day} ${hour}:${minute}:${second} IST`;
  } catch {
    return timestampStr;
  }
}

/**
 * Exports Batch Ingestion Ledger Results to CSV
 */
export function exportBatchResultsToCsv(
  batchData: BatchAutoIngestResponse,
  baseFilename: string = 'ecotrace_batch_ingestion_ledger'
): void {
  const { summary, rows, timestamp } = batchData;
  const istTimestamp = formatToIST(timestamp) || timestamp || new Date().toISOString();
  const lines: string[] = [];

  // 1. Report Header
  lines.push('ECOTRACE BATCH INGESTION LEDGER AUDIT REPORT');
  lines.push(`Generated: ${istTimestamp}`);
  lines.push('Status: 10-Dimension Comparability Evaluated');
  lines.push('');

  // 2. Summary Section
  lines.push('SUMMARY METRICS');
  lines.push('Metric Category,Count');
  lines.push(`Total Rows,${summary.total_rows}`);
  lines.push(`Verified,${summary.verified_count}`);
  lines.push(`Needs Review,${summary.needs_review_count}`);
  lines.push(`Rejected,${summary.rejected_count}`);
  lines.push(`Duplicates Retained,${summary.duplicate_count}`);
  lines.push(`Conflicts,${summary.conflict_count}`);
  lines.push(`Metrics Updated,${summary.metrics_updated_count}`);
  lines.push(`Remaining Data Gaps,${summary.remaining_data_gaps}`);
  lines.push('');

  // 3. Row-Level Ledger Header
  lines.push('ROW-LEVEL INGESTION LEDGER & PROVENANCE MAPPING');
  const headers = [
    'Row Number',
    'Destination',
    'Metric Code',
    'Metric Name',
    'Extracted/Audited Value',
    'Unit',
    'Period Span',
    'Source / Authority',
    'Citation / Evidence',
    'Status',
    'Integrity / Validation Notes',
    'Duplicate Status',
    'Conflict Status',
    'Verification / Review State',
  ];
  lines.push(headers.map(escapeCsv).join(','));

  // 4. Data Rows
  for (const r of rows) {
    const valStr = r.value !== null && r.value !== undefined ? r.value : 'N/A';
    const periodStr = `${r.period_start} to ${r.period_end}`;
    const notesStr = r.warnings && r.warnings.length > 0 ? r.warnings.join('; ') : 'All checks passed';
    const dupStr = r.is_duplicate ? 'Duplicate (Retained)' : 'Unique';
    const confStr = r.has_conflict ? (r.conflict_resolution_status || 'Conflict Evaluated') : 'None';
    const reviewState =
      r.status === 'VERIFIED'
        ? 'Verified'
        : r.status === 'NEEDS_REVIEW'
        ? 'Needs Review'
        : r.is_duplicate
        ? 'Duplicate Retained'
        : 'Rejected';

    const rowData = [
      r.row_index,
      r.destination_name,
      r.metric_code,
      r.metric_name,
      valStr,
      r.unit,
      periodStr,
      r.source_organization,
      r.evidence_location || '',
      r.status,
      notesStr,
      dupStr,
      confStr,
      reviewState,
    ];
    lines.push(rowData.map(escapeCsv).join(','));
  }

  // Download Trigger
  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseFilename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports Batch Ingestion Ledger Results to Excel (XLSX SpreadsheetML)
 */
export function exportBatchResultsToXlsx(
  batchData: BatchAutoIngestResponse,
  baseFilename: string = 'ecotrace_batch_ingestion_ledger'
): void {
  const { summary, rows, timestamp } = batchData;
  const istTimestamp = formatToIST(timestamp) || timestamp || new Date().toLocaleString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1C2A1E"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="TitleStyle">
   <Font ss:FontName="Segoe UI" ss:Size="15" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#244E31" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="MetaStyle">
   <Font ss:FontName="Segoe UI" ss:Size="9" ss:Italic="1" ss:Color="#5A6E5D"/>
   <Interior ss:Color="#FAF8F5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SectionHeader">
   <Font ss:FontName="Segoe UI" ss:Size="11" ss:Bold="1" ss:Color="#1C2A1E"/>
   <Interior ss:Color="#EBF2EA" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1C3E27" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
  </Style>
  <Style ss:ID="SummaryKey">
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#1C2A1E"/>
   <Interior ss:Color="#FAF8F5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SummaryVal">
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#244E31"/>
   <Alignment ss:Horizontal="Right"/>
  </Style>
  <Style ss:ID="StatusVerified">
   <Font ss:FontName="Segoe UI" ss:Size="9" ss:Bold="1" ss:Color="#244E31"/>
   <Interior ss:Color="#EBF2EA" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center"/>
  </Style>
  <Style ss:ID="StatusReview">
   <Font ss:FontName="Segoe UI" ss:Size="9" ss:Bold="1" ss:Color="#B45309"/>
   <Interior ss:Color="#FFF8F0" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center"/>
  </Style>
  <Style ss:ID="StatusRejected">
   <Font ss:FontName="Segoe UI" ss:Size="9" ss:Bold="1" ss:Color="#DC2626"/>
   <Interior ss:Color="#FEF2F2" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center"/>
  </Style>
  <Style ss:ID="StatusDuplicate">
   <Font ss:FontName="Segoe UI" ss:Size="9" ss:Bold="1" ss:Color="#7E22CE"/>
   <Interior ss:Color="#FAF5FF" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Ingestion Ledger">
  <Table ss:DefaultRowHeight="19">
   <Column ss:Width="40"/>
   <Column ss:Width="110"/>
   <Column ss:Width="130"/>
   <Column ss:Width="180"/>
   <Column ss:Width="95"/>
   <Column ss:Width="65"/>
   <Column ss:Width="130"/>
   <Column ss:Width="160"/>
   <Column ss:Width="150"/>
   <Column ss:Width="110"/>
   <Column ss:Width="230"/>
   <Column ss:Width="110"/>
   <Column ss:Width="110"/>
   <Column ss:Width="110"/>

   <Row ss:Height="28">
    <Cell ss:MergeAcross="13" ss:StyleID="TitleStyle"><Data ss:Type="String">EcoTrace Ingestion Ledger Audit &amp; Verification Report</Data></Cell>
   </Row>
   <Row ss:Height="18">
    <Cell ss:MergeAcross="13" ss:StyleID="MetaStyle"><Data ss:Type="String">Generated: ${istTimestamp} | Evaluated against 10-dimension comparability engine</Data></Cell>
   </Row>
   <Row ss:Height="10"></Row>

   <Row ss:Height="20">
    <Cell ss:MergeAcross="1" ss:StyleID="SectionHeader"><Data ss:Type="String">SUMMARY METRICS</Data></Cell>
   </Row>
   <Row><Cell ss:StyleID="SummaryKey"><Data ss:Type="String">Total Rows Evaluated</Data></Cell><Cell ss:StyleID="SummaryVal"><Data ss:Type="Number">${summary.total_rows}</Data></Cell></Row>
   <Row><Cell ss:StyleID="SummaryKey"><Data ss:Type="String">Verified</Data></Cell><Cell ss:StyleID="SummaryVal"><Data ss:Type="Number">${summary.verified_count}</Data></Cell></Row>
   <Row><Cell ss:StyleID="SummaryKey"><Data ss:Type="String">Needs Review</Data></Cell><Cell ss:StyleID="SummaryVal"><Data ss:Type="Number">${summary.needs_review_count}</Data></Cell></Row>
   <Row><Cell ss:StyleID="SummaryKey"><Data ss:Type="String">Rejected</Data></Cell><Cell ss:StyleID="SummaryVal"><Data ss:Type="Number">${summary.rejected_count}</Data></Cell></Row>
   <Row><Cell ss:StyleID="SummaryKey"><Data ss:Type="String">Duplicates Retained</Data></Cell><Cell ss:StyleID="SummaryVal"><Data ss:Type="Number">${summary.duplicate_count}</Data></Cell></Row>
   <Row><Cell ss:StyleID="SummaryKey"><Data ss:Type="String">Conflicts</Data></Cell><Cell ss:StyleID="SummaryVal"><Data ss:Type="Number">${summary.conflict_count}</Data></Cell></Row>
   <Row><Cell ss:StyleID="SummaryKey"><Data ss:Type="String">Metrics Updated</Data></Cell><Cell ss:StyleID="SummaryVal"><Data ss:Type="Number">${summary.metrics_updated_count}</Data></Cell></Row>
   <Row><Cell ss:StyleID="SummaryKey"><Data ss:Type="String">Remaining Data Gaps</Data></Cell><Cell ss:StyleID="SummaryVal"><Data ss:Type="Number">${summary.remaining_data_gaps}</Data></Cell></Row>
   <Row ss:Height="12"></Row>

   <Row ss:Height="24">
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">#</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Destination</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Metric Code</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Metric Name</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Audited Value</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Unit</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Period Span</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Source / Authority</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Citation / Evidence</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Status</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Integrity / Validation Notes</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Duplicate Status</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Conflict Status</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Verification State</Data></Cell>
   </Row>
   ${rows
     .map(r => {
       const isNum = r.value !== null && r.value !== undefined;
       const statusStyle =
         r.status === 'VERIFIED'
           ? 'StatusVerified'
           : r.status === 'NEEDS_REVIEW'
           ? 'StatusReview'
           : r.is_duplicate
           ? 'StatusDuplicate'
           : 'StatusRejected';
       const notes = r.warnings && r.warnings.length > 0 ? r.warnings.join('; ') : 'All checks passed';
       const dupStr = r.is_duplicate ? 'Duplicate (Retained)' : 'Unique';
       const confStr = r.has_conflict ? r.conflict_resolution_status || 'Conflict Evaluated' : 'None';
       const stateStr =
         r.status === 'VERIFIED'
           ? 'Verified'
           : r.status === 'NEEDS_REVIEW'
           ? 'Needs Review'
           : r.is_duplicate
           ? 'Duplicate Retained'
           : 'Rejected';

       return `<Row>
      <Cell><Data ss:Type="Number">${r.row_index}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(r.destination_name)}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(r.metric_code)}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(r.metric_name)}</Data></Cell>
      <Cell>${isNum ? `<Data ss:Type="Number">${r.value}</Data>` : `<Data ss:Type="String">N/A</Data>`}</Cell>
      <Cell><Data ss:Type="String">${escapeXml(r.unit)}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(r.period_start)} to ${escapeXml(r.period_end)}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(r.source_organization)}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(r.evidence_location || '')}</Data></Cell>
      <Cell ss:StyleID="${statusStyle}"><Data ss:Type="String">${escapeXml(r.status)}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(notes)}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(dupStr)}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(confStr)}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(stateStr)}</Data></Cell>
     </Row>`;
     })
     .join('\n   ')}
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseFilename}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports Batch Ingestion Ledger Results to Printable High-Resolution PDF
 */
export function exportBatchResultsToPdf(
  batchData: BatchAutoIngestResponse,
  baseFilename: string = 'ecotrace_batch_ingestion_ledger'
): void {
  const { summary, rows, timestamp, message } = batchData;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to open and print the PDF report.');
    return;
  }

  const rowsHtml = rows
    .map(r => {
      const isNum = r.value !== null && r.value !== undefined;
      const valText = isNum ? `${r.value?.toLocaleString()} ${r.unit}` : 'Missing / Gap';
      const notes = r.warnings && r.warnings.length > 0 ? r.warnings.join('; ') : 'All checks passed';
      const statusClass =
        r.status === 'VERIFIED'
          ? 'badge-verified'
          : r.status === 'NEEDS_REVIEW'
          ? 'badge-review'
          : r.is_duplicate
          ? 'badge-dup'
          : 'badge-rejected';
      const dupStr = r.is_duplicate ? 'Duplicate (Retained)' : 'Unique';
      const confStr = r.has_conflict ? r.conflict_resolution_status || 'Conflict' : 'None';

      return `<tr>
      <td class="center font-mono">${r.row_index}</td>
      <td><strong>${r.destination_name}</strong></td>
      <td><span class="font-mono code">${r.metric_code}</span><br/><small class="text-muted">${r.metric_name}</small></td>
      <td class="font-bold">${valText}</td>
      <td class="font-mono text-sm">${r.period_start} &rarr; ${r.period_end}</td>
      <td>${r.source_organization}<br/><small class="text-amber">${r.evidence_location || 'Ledger Excerpt'}</small></td>
      <td><span class="badge ${statusClass}">${r.status}</span></td>
      <td><small>${notes}</small></td>
      <td class="text-sm">${dupStr}</td>
      <td class="text-sm">${confStr}</td>
    </tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${baseFilename}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1C2A1E;
      background: #FFFFFF;
      margin: 0;
      padding: 16px;
      font-size: 11px;
      line-height: 1.4;
    }
    .header {
      border-bottom: 2px solid #244E31;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .title {
      font-size: 20px;
      font-weight: bold;
      color: #244E31;
      margin: 0 0 4px 0;
    }
    .subtitle {
      font-size: 12px;
      color: #5A6E5D;
      margin: 0;
    }
    .meta {
      text-align: right;
      font-size: 10px;
      color: #5A6E5D;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 8px;
      margin-bottom: 20px;
    }
    .summary-card {
      background: #FAF8F5;
      border: 1px solid #E8E3D7;
      border-radius: 8px;
      padding: 8px;
      text-align: center;
    }
    .summary-card.verified { background: #EBF2EA; border-color: #D5E4D2; }
    .summary-card.review { background: #FFF8F0; border-color: #F3DFC7; }
    .summary-card.rejected { background: #FEF2F2; border-color: #FECACA; }
    .summary-card.dup { background: #FAF5FF; border-color: #E9D5FF; }
    .summary-label {
      font-size: 8.5px;
      font-weight: bold;
      text-transform: uppercase;
      color: #5A6E5D;
      display: block;
      margin-bottom: 2px;
    }
    .summary-value {
      font-size: 16px;
      font-weight: bold;
      color: #1C2A1E;
    }
    .verified .summary-value { color: #244E31; }
    .review .summary-value { color: #B45309; }
    .rejected .summary-value { color: #DC2626; }
    .dup .summary-value { color: #7E22CE; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5px;
    }
    th {
      background: #FAF8F5;
      color: #5A6E5D;
      font-size: 9px;
      text-transform: uppercase;
      font-weight: bold;
      padding: 6px 8px;
      border-top: 1px solid #E8E3D7;
      border-bottom: 2px solid #E8E3D7;
      text-align: left;
    }
    td {
      padding: 6px 8px;
      border-bottom: 1px solid #EFEAE0;
      vertical-align: top;
    }
    tr:nth-child(even) td {
      background: #FAF9F7;
    }
    .center { text-align: center; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .code { font-weight: bold; color: #244E31; }
    .text-muted { color: #5A6E5D; }
    .text-amber { color: #8C733E; }
    .font-bold { font-weight: bold; }
    .text-sm { font-size: 9px; }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 8.5px;
      font-weight: bold;
      white-space: nowrap;
    }
    .badge-verified { background: #EBF2EA; color: #244E31; border: 1px solid #D5E4D2; }
    .badge-review { background: #FFF8F0; color: #B45309; border: 1px solid #F3DFC7; }
    .badge-rejected { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; }
    .badge-dup { background: #FAF5FF; color: #7E22CE; border: 1px solid #E9D5FF; }
    .footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #E8E3D7;
      font-size: 9px;
      color: #5A6E5D;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">EcoTrace Ingestion Ledger Audit Report</h1>
      <p class="subtitle">${escapeXml(message || 'Row-Level Ingestion Ledger & 10-Dimension Comparability Evaluation')}</p>
    </div>
    <div class="meta">
      <div><strong>Report Date (IST):</strong> ${formatToIST(timestamp) || timestamp || new Date().toLocaleString()}</div>
      <div><strong>Total Records:</strong> ${rows.length}</div>
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <span class="summary-label">Total Rows</span>
      <span class="summary-value">${summary.total_rows}</span>
    </div>
    <div class="summary-card verified">
      <span class="summary-label">Verified</span>
      <span class="summary-value">${summary.verified_count}</span>
    </div>
    <div class="summary-card review">
      <span class="summary-label">Needs Review</span>
      <span class="summary-value">${summary.needs_review_count}</span>
    </div>
    <div class="summary-card rejected">
      <span class="summary-label">Rejected</span>
      <span class="summary-value">${summary.rejected_count}</span>
    </div>
    <div class="summary-card dup">
      <span class="summary-label">Duplicates</span>
      <span class="summary-value">${summary.duplicate_count}</span>
    </div>
    <div class="summary-card">
      <span class="summary-label">Conflicts</span>
      <span class="summary-value">${summary.conflict_count}</span>
    </div>
    <div class="summary-card">
      <span class="summary-label">Metrics Updated</span>
      <span class="summary-value">${summary.metrics_updated_count}</span>
    </div>
    <div class="summary-card">
      <span class="summary-label">Remaining Gaps</span>
      <span class="summary-value">${summary.remaining_data_gaps}</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="center">#</th>
        <th>Destination</th>
        <th>Metric</th>
        <th>Audited Value</th>
        <th>Period Span</th>
        <th>Authority / Citation</th>
        <th>Status</th>
        <th>Integrity Notes</th>
        <th>Duplicate</th>
        <th>Conflict</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="footer">
    <div>EcoTrace Governance &amp; Regenerative Tourism Telemetry Ledger</div>
    <div>Page 1 &bull; Deterministic Multi-Source Provenance Audit</div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
