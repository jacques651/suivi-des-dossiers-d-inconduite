// src/components/DocumentHeader.tsx
import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import dayjs from 'dayjs';
import { ParametreGeneral } from './referentiels/types';

type Orientation = 'portrait' | 'landscape';

export const usePrint = () => {
  const [params, setParams] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadParams = async () => {
      try {
        const result = await invoke('get_parametres_generaux');
        const data = result as ParametreGeneral[];

        const paramsMap: Record<string, string> = {};
        data.forEach(p => {
          paramsMap[p.Code] = p.Valeur;
        });

        setParams(paramsMap);
      } catch (error) {
        console.error('Erreur chargement paramètres:', error);
      }
    };

    loadParams();
  }, []);

  const printDocument = (
    content: string,
    title: string,
    orientation: Orientation = 'portrait'
  ) => {
    const logo = params.LOGO_PATH || '';
    const ministere = params.MINISTERE || 'MINISTERE DE LA SECURITE';
    const cabinet = params.CABINET || 'CABINET';
    const service = params.SERVICE || 'INSPECTION TECHNIQUE DES SERVICES';
    const reference = params.REFERENCE || 'N°2025 ______/MISECU/CAB/ITS/CONF';
    const pays = params.PAYS || 'BURKINA FASO';
    const devise = params.DEVISE || 'La Patrie ou la Mort, nous vaincrons';
    const expediteur = params.EXPEDITEUR || "L'Inspecteur Général des Services";
    const destinataire = params.DESTINATAIRE || 'Ministre de la Sécurité';

    const html = `
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
  margin: 40px;
  color: black;
}

/* HEADER */
.header {
  display: grid;
  grid-template-columns: 1fr 120px 1fr;
  align-items: start;
  margin-bottom: 40px;
}

.left { text-align: left; line-height: 1.6; }
.center { text-align: center; }
.right { text-align: right; line-height: 1.6; }

.logo { height: 80px; }

.separator {
  border-top: 1px solid black;
  width: 60px;
  margin: 5px 0;
}

.ref { margin-top: 15px; }

/* SIGNATURE */
.signature {
  text-align: right;
  margin-top: 40px;
  line-height: 2;
}

/* TITRE */
.objet {
  margin-top: 30px;
  font-weight: bold;
}

/* TABLE */
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

th, td {
  border: 1px solid black;
  padding: 6px;
  font-size: 12px;
}

th {
  background: #ddd;
}

tr {
  page-break-inside: avoid;
}

/* FOOTER */
.footer {
  text-align: center;
  font-size: 9pt;
  margin-top: 30px;
}

</style>
</head>

<body>

<div class="header">

  <div class="left">
    <div><strong>${ministere}</strong></div>
    <div class="separator"></div>

    <div>${cabinet}</div>
    <div class="separator"></div>

    <div><strong>${service}</strong></div>
    <div class="separator"></div>

    <div class="ref">${reference}</div>
  </div>

  <div class="center">
    ${logo ? `<img src="${logo}" class="logo" />` : ''}
  </div>

  <div class="right">
    <div><strong>${pays}</strong></div>
    <div><em>${devise}</em></div>
  </div>

</div>

<div class="signature">
  <div>${expediteur}</div>
  <div>A</div>
  <div><strong>${destinataire}</strong></div>
</div>

<div class="objet">${title}</div>

${content}

<div class="footer">
  Document généré le ${dayjs().format('DD/MM/YYYY à HH:mm')}
</div>

</body>
</html>
    `;

    // 🔥 SANS POPUP
    const original = document.body.innerHTML;

    document.body.innerHTML = html;

    window.print();

    document.body.innerHTML = original;

    // recharge propre (important pour React)
    window.location.reload();
  };

  return { printDocument };
};