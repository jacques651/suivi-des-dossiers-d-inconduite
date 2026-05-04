// src/hooks/usePrint.ts
import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import dayjs from 'dayjs';

type Orientation = 'portrait' | 'landscape';

interface ParametreGeneral {
  Code: string;
  Valeur: string;
}

export const usePrint = () => {
  const [params, setParams] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadParams = async () => {
      try {
        const result = await invoke('get_parametres_generaux');
        const data = result as ParametreGeneral[];

        const map: Record<string, string> = {};
        data.forEach(p => (map[p.Code] = p.Valeur));

        setParams(map);
      } catch (e) {
        console.error(e);
      }
    };

    loadParams();
  }, []);

  const buildHtml = (
    content: string,
    title: string,
    orientation: Orientation
  ) => {
    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title}</title>

<style>

@page {
  size: A4 ${orientation};
  margin: 20mm;
}

body {
  font-family: "Times New Roman", serif;
  font-size: 14px;
  color: black;
}

/* ===== HEADER ===== */
.header {
  display: grid;
  grid-template-columns: 1fr 120px 1fr;
  align-items: start;
  margin-bottom: 30px;
}

.left { text-align: left; line-height: 1.6; }
.center { text-align: center; }
.right { text-align: right; line-height: 1.6; }

.logo { height: 70px; }

.separator {
  border-top: 1px solid black;
  width: 60px;
  margin: 5px 0;
}

/* ===== SIGNATURE ===== */
.signature {
  text-align: right;
  margin-top: 30px;
  line-height: 2;
}

/* ===== TITRE ===== */
.objet {
  margin-top: 30px;
  font-weight: bold;
}

/* ===== TABLE ===== */
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  font-size: 12px;
}

th, td {
  border: 1px solid black;
  padding: 4px;
}

th {
  background: #eee;
  text-align: center;
}

td {
  vertical-align: top;
}

/* éviter coupure lignes */
tr {
  page-break-inside: avoid;
}

</style>
</head>

<body>

<!-- HEADER -->
<div class="header">
  <div class="left">
    <strong>${params.MINISTERE || ''}</strong>
    <div class="separator"></div>
    ${params.CABINET || ''}
    <div class="separator"></div>
    <strong>${params.SERVICE || ''}</strong>
    <div class="separator"></div>
    ${params.REFERENCE || ''}
  </div>

  <div class="center">
    ${
      params.LOGO_PATH
        ? `<img src="${params.LOGO_PATH}" class="logo" />`
        : ''
    }
  </div>

  <div class="right">
    <strong>${params.PAYS || ''}</strong><br/>
    <em>${params.DEVISE || ''}</em>
  </div>
</div>

<!-- SIGNATURE -->
<div class="signature">
  ${params.EXPEDITEUR || ''}<br/>
  A<br/>
  <strong>${params.DESTINATAIRE || ''}</strong>
</div>

<!-- TITRE -->
<div class="objet">${title}</div>

<!-- CONTENU -->
${content}

<!-- FOOTER -->
<div style="text-align:center; margin-top:20px; font-size:10px;">
  Généré le ${dayjs().format('DD/MM/YYYY HH:mm')}
</div>

</body>
</html>
    `;
  };

  const printDocument = (
    content: string,
    title: string,
    orientation: Orientation = 'portrait'
  ) => {
    const html = buildHtml(content, title, orientation);

    const original = document.body.innerHTML;

    document.body.innerHTML = html;

    // 🔥 impression native sans popup
    window.print();

    // restauration
    document.body.innerHTML = original;

    // recharge React proprement
    window.location.reload();
  };

  return { printDocument };
};