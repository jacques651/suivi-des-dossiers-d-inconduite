// src/hooks/usePrint.ts
import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import dayjs from 'dayjs';

interface ParametreGeneral {
  Code: string;
  Valeur: string;
}

type Orientation = 'portrait' | 'landscape';

interface UsePrintReturn {
  printDocument: (content: string, title: string, orientation?: Orientation, showHeader?: boolean, signataire?: SignataireData) => void;
  printElement: (element: HTMLElement, title: string, orientation?: Orientation, showHeader?: boolean, signataire?: SignataireData) => void;
  isLoading: boolean;
}

interface SignataireData {
  Nom: string;
  Prenom: string;
  Grade: string;
  Fonction: string;
  TitreHonorifique: string;
}

export const usePrint = (): UsePrintReturn => {
  const [params, setParams] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

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
      } finally {
        setIsLoading(false);
      }
    };

    loadParams();
  }, []);

  const buildHtml = (
    content: string,
    title: string,
    orientation: Orientation,
    showHeader: boolean = true,
    signataire?: SignataireData
  ) => {
    if (!showHeader) {
      return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  @page {
    size: A4 ${orientation};
    margin: 1.5cm;
  }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    padding: 20px;
    background: white;
    margin: 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th {
    background: #1b365d;
    color: white;
    padding: 10px;
    border: 1px solid #2a4a7a;
  }
  td {
    padding: 8px;
    border: 1px solid #ddd;
  }
  @media print {
    th {
      background: #1b365d !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
</style>
</head>
<body>
  ${content}
  <div style="text-align:center; margin-top:30px; font-size:10px; color:#999;">
    Document généré le ${dayjs().format('DD/MM/YYYY à HH:mm')}
  </div>
</body>
</html>
      `;
    }

    // Valeurs par défaut ou depuis les paramètres
    const logo = params.LOGO_PATH || '';
    const ministere = params.MINISTERE || 'MINISTERE DE LA SECURITE';
    const cabinet = params.CABINET || 'CABINET';
    const service = params.SERVICE || 'INSPECTION TECHNIQUE DES SERVICES';
    const reference = params.REFERENCE || 'N°2025 ______/MISECU/CAB/ITS/CONF';
    const pays = params.PAYS || 'BURKINA FASO';
    const devise = params.DEVISE || 'La Patrie ou la Mort, nous vaincrons';
    const expediteur = params.EXPEDITEUR || "L'Inspecteur Général des Services";
    const destinataire = params.DESTINATAIRE || 'Monsieur le Ministre de la Sécurité';

    // Récupération des données du signataire
    const signataireNom = signataire?.Nom || '';
    const signatairePrenom = signataire?.Prenom || '';
    const signataireGrade = signataire?.Grade || '';
    let signataireFonction = signataire?.Fonction || '';
    const signataireTitre = signataire?.TitreHonorifique || '';

    // Logique Access : masquer la fonction si c'est "L'Inspecteur Général des Services"
    const fonctionsAMasquer = ["L'Inspecteur Général des Services", "Inspecteur Général des Services"];
    const afficherFonction = signataireFonction && !fonctionsAMasquer.includes(signataireFonction);

    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  @page {
    size: A4 ${orientation};
    margin: 1.5cm;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', 'Times New Roman', serif;
    background: white;
    padding: 20px;
    margin: 0;
  }

  /* EN-TÊTE - 3 COLONNES */
  .header {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 1rem;
    margin-bottom: 2rem;
    align-items: start;
  }

  /* Colonne gauche : Ministère / Cabinet / Service */
  .header-left {
    text-align: center;
  }
  .header-left .title {
    font-size: 0.7rem;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.25rem;
  }
  .separator {
    width: 4rem;
    height: 1px;
    background: #d1d5db;
    margin: 0.5rem auto;
  }
  .reference {
    font-size: 0.65rem;
    margin-top: 0.5rem;
  }

  /* Colonne centre : Logo */
  .header-center {
    text-align: center;
    min-width: 100px;
  }
  .logo {
    height: 80px;
    max-width: 100px;
    object-fit: contain;
  }
  .logo-placeholder {
    font-size: 0.7rem;
    color: #9ca3af;
  }

  /* Colonne droite : Pays et devise */
  .header-right {
    text-align: center;
  }
  .country {
    font-size: 0.7rem;
    font-weight: bold;
    text-transform: uppercase;
    margin-bottom: 0.25rem;
  }
  .motto {
    font-size: 0.65rem;
    font-style: italic;
  }

  /* DESTINATAIRE - Aligné à droite */
  .destinataire {
    text-align: right;
    margin-bottom: 2rem;
  }
  .destinataire .expediteur {
    font-size: 0.8rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  .destinataire .a {
    font-size: 0.8rem;
    margin-bottom: 0.5rem;
  }
  .destinataire .destinataire-nom {
    font-size: 0.8rem;
    font-weight: 600;
  }

  /* OBJET */
  .objet {
    margin-bottom: 2rem;
  }
  .objet-label {
    font-size: 0.8rem;
    font-weight: 600;
  }
  .objet-texte {
    font-size: 0.8rem;
    margin-left: 0.5rem;
  }

  /* TABLEAU */
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 2rem;
  }
  th, td {
    border: 1px solid #e5e7eb;
    padding: 8px;
    font-size: 0.7rem;
    text-align: left;
  }
  th {
    background: #f3f4f6;
    font-weight: 600;
  }
  tr:nth-child(even) {
    background: #f9fafb;
  }

  /* SIGNATURE - Alignée à droite */
  .signature {
    text-align: right;
    margin-top: 2rem;
  }
  .signature-fonction {
    font-size: 0.8rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }
  .signature-nom {
    font-size: 0.8rem;
    font-weight: 600;
    text-decoration: underline;
    margin-top: 1.5rem;
  }
  .signature-grade {
    font-size: 0.75rem;
    margin-top: 0.25rem;
  }
  .signature-titre {
    font-size: 0.7rem;
    color: #6b7280;
    margin-top: 0.25rem;
  }
  .signature-line {
    width: 150px;
    height: 1px;
    background: #9ca3af;
    margin-top: 1rem;
    margin-left: auto;
  }
  .signature-cachet {
    font-size: 0.65rem;
    color: #9ca3af;
    margin-top: 0.25rem;
  }
  .signature-date {
    font-size: 0.65rem;
    color: #9ca3af;
    margin-top: 0.5rem;
  }

  /* PIED DE PAGE */
  .footer {
    text-align: center;
    font-size: 0.65rem;
    color: #9ca3af;
    margin-top: 2rem;
    padding-top: 0.5rem;
    border-top: 1px solid #e5e7eb;
  }

  @media print {
    body {
      padding: 0;
    }
    th {
      background: #f3f4f6 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .no-print {
      display: none;
    }
  }
</style>
</head>
<body>

<!-- EN-TÊTE 3 COLONNES -->
<div class="header">
  <!-- Colonne gauche -->
  <div class="header-left">
    <div class="title">${ministere}</div>
    <div class="separator"></div>
    <div class="title" style="font-weight: normal;">${cabinet}</div>
    <div class="separator"></div>
    <div class="title">${service}</div>
    <div class="separator"></div>
    <div class="reference">${reference}</div>
  </div>

  <!-- Colonne centre : Logo -->
  <div class="header-center">
    ${logo ? `<img src="${logo}" class="logo" onerror="this.style.display='none'" />` : '<div class="logo-placeholder">[Emblème Officiel]</div>'}
  </div>

  <!-- Colonne droite -->
  <div class="header-right">
    <div class="country">${pays}</div>
    <div class="motto">${devise}</div>
  </div>
</div>

<!-- DESTINATAIRE (aligné à droite) -->
<div class="destinataire">
  <div class="expediteur">${expediteur}</div>
  <div class="a">A</div>
  <div class="destinataire-nom">${destinataire}</div>
</div>

<!-- OBJET -->
<div class="objet">
  <span class="objet-label">Objet :</span>
  <span class="objet-texte">${title}</span>
</div>

<!-- CONTENU PRINCIPAL (tableau) -->
${content}

<!-- SIGNATURE (alignée à droite) -->
<div class="signature">
  ${afficherFonction ? `<div class="signature-fonction">${signataireFonction}</div>` : '<div style="margin-bottom: 1rem;"></div>'}
  <div class="signature-nom">${signatairePrenom} ${signataireNom}</div>
  ${signataireGrade ? `<div class="signature-grade">${signataireGrade}</div>` : ''}
  ${signataireTitre ? `<div class="signature-titre">${signataireTitre}</div>` : ''}
  <div class="signature-line"></div>
  <div class="signature-date">Fait à Ouagadougou, le ${dayjs().format('DD/MM/YYYY')}</div>
</div>

<!-- PIED DE PAGE -->
<div class="footer">
  Document généré automatiquement - Gestion des Agents © ${new Date().getFullYear()}
</div>

</body>
</html>
    `;
  };

  // Méthode pour imprimer du contenu HTML (SANS POPUP)
  const printDocument = (
    content: string,
    title: string,
    orientation: Orientation = 'portrait',
    showHeader: boolean = false,
    signataire?: SignataireData
  ) => {
    const html = buildHtml(content, title, orientation, showHeader, signataire);

    // Créer un iframe invisible (pas de popup)
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(html);
      iframeDoc.close();

      // Attendre le chargement puis imprimer
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      }, 500);
    } else {
      console.error('Impossible de créer l\'iframe d\'impression');
    }
  };

  // Méthode pour imprimer un élément DOM existant
  const printElement = (
    element: HTMLElement,
    title: string,
    orientation: Orientation = 'landscape',
    showHeader: boolean = true,
    signataire?: SignataireData
  ) => {
    const content = element.outerHTML;
    printDocument(content, title, orientation, showHeader, signataire);
  };

  return { printDocument, printElement, isLoading };
};