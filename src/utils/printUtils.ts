export const buildDocumentHtml = (
  rows: string,
  title: string,
  orientation: 'portrait' | 'landscape',
  params: Record<string, string>
) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">

    <style>
      @page { size: A4 ${orientation}; margin: 20mm; }

      body {
        font-family: "Times New Roman", serif;
        font-size: 12pt;
        color: black;
      }

      .header {
        display: grid;
        grid-template-columns: 1fr 120px 1fr;
        margin-bottom: 30px;
      }

      .left { text-align:left; }
      .center { text-align:center; }
      .right { text-align:right; }

      .logo { height: 70px; }

      h3 {
        text-align: center;
        margin: 20px 0;
      }

      table {
        width:100%;
        border-collapse: collapse;
        margin-top:20px;
      }

      th, td {
        border:1px solid black;
        padding:6px;
        font-size:11px;
      }

      th {
        background:#1b365d;
        color:white;
      }
    </style>
  </head>

  <body>

    <div class="header">
      <div class="left">
        <strong>${params.MINISTERE || ''}</strong><br/>
        ${params.CABINET || ''}<br/>
        <strong>${params.SERVICE || ''}</strong><br/>
        ${params.REFERENCE || ''}
      </div>

      <div class="center">
        ${params.LOGO_PATH ? `<img src="${params.LOGO_PATH}" class="logo"/>` : ''}
      </div>

      <div class="right">
        <strong>${params.PAYS || ''}</strong><br/>
        <em>${params.DEVISE || ''}</em>
      </div>
    </div>

    <h3>${title}</h3>

    <table>
      ${rows}
    </table>

  </body>
  </html>
  `;
};