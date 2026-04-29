// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{Connection, Result, params};
use tauri::generate_context;
use std::sync::Mutex;
use serde_json::Value;

struct AppState {
    db: Mutex<Connection>,
}

fn init_db() -> Result<Connection> {
    // Éviter la boucle de rechargement en utilisant un dossier hors du watcher
    let db_path = if cfg!(debug_assertions) {
        // En développement : utiliser le dossier target (non surveillé)
        let current_exe = std::env::current_exe().unwrap_or_else(|_| std::path::PathBuf::from("."));
        let target_dir = current_exe.parent().unwrap_or_else(|| std::path::Path::new("."));
        target_dir.join("suivi_dossiers.db").to_str().unwrap_or("suivi_dossiers.db").to_string()
    } else {
        // En production : utiliser le dossier AppData
        let app_data = std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
        let app_folder = format!("{}/bd_sdi", app_data);
        let _ = std::fs::create_dir_all(&app_folder);
        format!("{}/suivi_dossiers.db", app_folder)
    };
    
    println!("Database path: {}", db_path);
    let conn = Connection::open(db_path)?;
    
    
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS Agent (
            PersonnelID INTEGER PRIMARY KEY AUTOINCREMENT,
            Matricule TEXT UNIQUE NOT NULL,
            Cle TEXT,
            Nom TEXT NOT NULL,
            Prenom TEXT NOT NULL,
            GradeID INTEGER,
            Service TEXT,
            Entite TEXT,
            Sexe TEXT,
            Photo TEXT
        );
        
        CREATE TABLE IF NOT EXISTS Rapport (
            RapportID INTEGER PRIMARY KEY AUTOINCREMENT,
            LibelleRapport TEXT NOT NULL,
            NumeroRapport TEXT UNIQUE NOT NULL,
            DateRapport DATE NOT NULL,
            TypeInspection TEXT,
            PeriodeSousRevue TEXT,
            Fichier TEXT
        );
        
        CREATE TABLE IF NOT EXISTS Dossier (
            DossierID INTEGER PRIMARY KEY AUTOINCREMENT,
            PersonnelID INTEGER NOT NULL,
            TypeInconduite TEXT,
            PeriodeInconduite TEXT,
            Annee INTEGER,
            ServiceInvestigation TEXT,
            Etat TEXT DEFAULT 'En cours',
            SuiteReservee TEXT,
            TypeSanction TEXT,
            Sanction TEXT,
            ActeSanction TEXT,
            NumeroActeSanction TEXT,
            AutoriteSanction TEXT,
            Observations TEXT,
            IDRapport INTEGER,
            FOREIGN KEY (PersonnelID) REFERENCES Agent(PersonnelID) ON DELETE CASCADE,
            FOREIGN KEY (IDRapport) REFERENCES Rapport(RapportID) ON DELETE SET NULL
        );
        
        CREATE TABLE IF NOT EXISTS Recommandation (
            RecommandationID INTEGER PRIMARY KEY AUTOINCREMENT,
            Services TEXT,
            Source TEXT,
            RapportID INTEGER NOT NULL,
            ProblemeFaiblesse TEXT,
            NumeroRecommandation TEXT,
            TexteRecommandation TEXT NOT NULL,
            ResponsableMiseEnOeuvre TEXT,
            ActeursImpliques TEXT,
            InstanceValidation TEXT,
            Echeance DATE,
            Domaine TEXT,
            FOREIGN KEY (RapportID) REFERENCES Rapport(RapportID) ON DELETE CASCADE
        );
        
        CREATE TABLE IF NOT EXISTS SuiviRecommandation (
            SuiviID INTEGER PRIMARY KEY AUTOINCREMENT,
            RecommandationID INTEGER NOT NULL,
            MesuresCorrectives TEXT,
            DateDebut DATE,
            DateFin DATE,
            NiveauMiseEnOeuvre TEXT DEFAULT 'Non commencé',
            ObservationDelai TEXT,
            ObservationMiseEnOeuvre TEXT,
            AppreciationControle TEXT,
            ReferenceJustificatif TEXT,
            FOREIGN KEY (RecommandationID) REFERENCES Recommandation(RecommandationID) ON DELETE CASCADE
        );
        
        CREATE TABLE IF NOT EXISTS Document (
            DocumentID INTEGER PRIMARY KEY AUTOINCREMENT,
            NomFichier TEXT NOT NULL,
            Fichier TEXT,
            TypeDocument TEXT,
            RapportID INTEGER,
            SuiviID INTEGER,
            FOREIGN KEY (RapportID) REFERENCES Rapport(RapportID) ON DELETE CASCADE,
            FOREIGN KEY (SuiviID) REFERENCES SuiviRecommandation(SuiviID) ON DELETE CASCADE
        );
        
        CREATE TABLE IF NOT EXISTS Grade (
            GradeID INTEGER PRIMARY KEY AUTOINCREMENT,
            LibelleGrade TEXT NOT NULL UNIQUE,
            Ordre INTEGER
        );
        
        CREATE TABLE IF NOT EXISTS Sanction (
            SanctionID INTEGER PRIMARY KEY AUTOINCREMENT,
            LibelleSanction TEXT NOT NULL UNIQUE,
            Categorie TEXT,
            Niveau INTEGER
        );
        
        CREATE TABLE IF NOT EXISTS ServiceInvestigation (
            ServiceID INTEGER PRIMARY KEY AUTOINCREMENT,
            LibelleService TEXT NOT NULL UNIQUE,
            Acronyme TEXT,
            Ordre INTEGER,
            Actif INTEGER DEFAULT 1
        );
        
        CREATE TABLE IF NOT EXISTS EnteteConfig (
            ConfigID INTEGER PRIMARY KEY AUTOINCREMENT,
            Composant TEXT NOT NULL,
            Champ TEXT NOT NULL,
            Valeur TEXT,
            Ordre INTEGER DEFAULT 0,
            Actif INTEGER DEFAULT 1,
            UNIQUE(Composant, Champ)
        );
        
        CREATE TABLE IF NOT EXISTS Logs (
            LogID INTEGER PRIMARY KEY AUTOINCREMENT,
            Utilisateur TEXT,
            Action TEXT,
            TableConcernee TEXT,
            EnregistrementID INTEGER,
            DateLog DATETIME DEFAULT CURRENT_TIMESTAMP,
            Details TEXT
        );
        
        CREATE INDEX IF NOT EXISTS idx_dossier_personnel ON Dossier(PersonnelID);
        CREATE INDEX IF NOT EXISTS idx_recommandation_rapport ON Recommandation(RapportID);
        "
    )?;
    
    // Insertion des grades
    let grades = vec![
        (1, "Adjutant-Chef de Police"), (2, "Adjutant-Chef Major de Police"),
        (3, "Capitaine de Police"), (4, "Commandant de Police"),
        (5, "Commandant Major de Police"), (6, "Commissaire de Police"),
        (7, "Commissaire Divisionnaire de Police"), (8, "Commissaire Principal de Police"),
        (9, "Contrôleur Général de Police"), (10, "Inspecteur Général de Police"),
        (11, "Lieutenant de police"), (12, "Médecin-Commissaire Divisionnaire de Police"),
        (13, "Médecin-Commissaire Principal de Police"), (14, "Sergent de Police"),
        (15, "Sergent-Chef de Police"), (16, "Sous-lieutenant de Police"),
        (17, "Maréchal des logies"), (18, "MDL-Chef"), (19, "Elève officier de police"),
        (20, "Capitaine de Gendarmerie"), (21, "Commandant de Gendarmerie"),
        (22, "Adjutant-Chef Major"), (23, "Adjutant"), (24, "Maréchal des Logis Chef"),
        (25, "Maréchal des Logis"), (26, "Adjutant-Chef"), (28, "Adjutant de Police")
    ];
    
    for (id, libelle) in grades {
        conn.execute(
            "INSERT OR IGNORE INTO Grade (GradeID, LibelleGrade, Ordre) VALUES (?1, ?2, ?3)",
            params![id, libelle, id],
        ).ok();
    }
    
    // Insertion des sanctions
    let sanctions = vec![
        "Avertissement avec inscription au dossier",
        "Consigne au casernement",
        "Arrêt simple",
        "Détention en salle de police",
        "Arrêt de rigueur",
        "Blâme",
        "Radiation du tableau d'avancement",
        "Abaissement d'échelon",
        "Rétrogradation",
        "Mise à la retraite d'office",
        "Révocation",
        "Licenciement"
    ];
    
    for (i, sanction) in sanctions.iter().enumerate() {
        conn.execute(
            "INSERT OR IGNORE INTO Sanction (LibelleSanction, Niveau) VALUES (?1, ?2)",
            params![sanction, i as i64 + 1],
        ).ok();
    }
    
    // Insertion des services d'investigation
    let services = vec![
        (1, "L'Inspection technique des services (ITS)", "ITS"),
        (2, "le Service contrôle de la direction générale de la police nationale", "SC-DGPN"),
        (3, "la Coordination nationale de contrôle des forces de police", "CONACFP"),
        (4, "le contrôle interne de l'Académie de police", "ACADEMIE"),
        (5, "le contrôle interne de l'Ecole nationale de police", "ENP"),
        (6, "le contrôle interne de l'Office national d'identification", "ONI"),
        (7, "le contrôle interne de l'Office national de sécurisation des sites miniers", "ONASSIM"),
        (8, "le contrôle interne de l'Office national de sécurité routière", "ONASER"),
        (9, "L'Autorité Supérieure de Contrôle de Contrôle d'Etat", "ASCE-LC"),
        (10, "L'Inspection Générale des Finances", "IGF"),
        (11, "L'Inspection générale des forces armées nationales", "IGFAN"),
        (12, "l'Inspection interne de la Gendarmerie nationale", "GENDARMERIE"),
        (13, "le Réseau national de lutte contre la corruption", "REN-LAC")
    ];
    
    for (id, libelle, acronyme) in services {
        conn.execute(
            "INSERT OR IGNORE INTO ServiceInvestigation (ServiceID, LibelleService, Acronyme, Ordre) VALUES (?1, ?2, ?3, ?4)",
            params![id, libelle, acronyme, id],
        ).ok();
    }
    
    // Insertion des configurations d'en-tête
    let entete_configs = vec![
        ("app", "nom_app", "BD-SDI - Suivi des Inspections et Dossiers Disciplinaires", 1),
        ("app", "version", "1.0.0", 2),
        ("app", "logo", "", 3),
        ("rapport", "entete", "[NUMERO] - [LIBELLE] - [DATE]", 1),
        ("dossier", "entete", "DOSSIER N° [ID] - [AGENT] - [ETAT]", 1),
        ("recommandation", "entete", "REC-[NUMERO] - [RAPPORT] - [ECHEANCE]", 1),
    ];
    
    for config in entete_configs {
        conn.execute(
            "INSERT OR IGNORE INTO EnteteConfig (Composant, Champ, Valeur, Ordre) VALUES (?1, ?2, ?3, ?4)",
            config,
        ).ok();
    }
    
    Ok(conn)
}

// ==================== AGENTS ====================
#[tauri::command]
fn create_agent(state: tauri::State<AppState>, agent: Value) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO Agent (Matricule, Cle, Nom, Prenom, GradeID, Service, Entite, Sexe, Photo) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            agent["Matricule"].as_str().unwrap_or(""),
            agent["Cle"].as_str().unwrap_or(""),
            agent["Nom"].as_str().unwrap_or(""),
            agent["Prenom"].as_str().unwrap_or(""),
            agent["GradeID"].as_i64().unwrap_or(0),
            agent["Service"].as_str().unwrap_or(""),
            agent["Entite"].as_str().unwrap_or(""),
            agent["Sexe"].as_str().unwrap_or(""),
            agent["Photo"].as_str().unwrap_or(""),
        ],
    ).map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn get_agents(state: tauri::State<AppState>) -> Result<Vec<Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT * FROM Agent ORDER BY Nom, Prenom").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "PersonnelID": row.get::<_, i64>(0)?,
            "Matricule": row.get::<_, String>(1)?,
            "Cle": row.get::<_, Option<String>>(2)?,
            "Nom": row.get::<_, String>(3)?,
            "Prenom": row.get::<_, String>(4)?,
            "GradeID": row.get::<_, Option<i64>>(5)?,
            "Service": row.get::<_, Option<String>>(6)?,
            "Entite": row.get::<_, Option<String>>(7)?,
            "Sexe": row.get::<_, Option<String>>(8)?,
            "Photo": row.get::<_, Option<String>>(9)?,
        }))
    }).map_err(|e| e.to_string())?;
    
    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn update_agent(state: tauri::State<AppState>, agent: Value) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE Agent SET Matricule=?1, Cle=?2, Nom=?3, Prenom=?4, GradeID=?5, 
         Service=?6, Entite=?7, Sexe=?8, Photo=?9 WHERE PersonnelID=?10",
        params![
            agent["Matricule"].as_str().unwrap_or(""),
            agent["Cle"].as_str().unwrap_or(""),
            agent["Nom"].as_str().unwrap_or(""),
            agent["Prenom"].as_str().unwrap_or(""),
            agent["GradeID"].as_i64().unwrap_or(0),
            agent["Service"].as_str().unwrap_or(""),
            agent["Entite"].as_str().unwrap_or(""),
            agent["Sexe"].as_str().unwrap_or(""),
            agent["Photo"].as_str().unwrap_or(""),
            agent["PersonnelID"].as_i64().unwrap_or(0),
        ],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_agent(state: tauri::State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM Agent WHERE PersonnelID=?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ==================== RAPPORTS ====================
#[tauri::command]
fn create_rapport(state: tauri::State<AppState>, rapport: Value) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO Rapport (LibelleRapport, NumeroRapport, DateRapport, TypeInspection, PeriodeSousRevue, Fichier) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            rapport["LibelleRapport"].as_str().unwrap_or(""),
            rapport["NumeroRapport"].as_str().unwrap_or(""),
            rapport["DateRapport"].as_str().unwrap_or(""),
            rapport["TypeInspection"].as_str().unwrap_or(""),
            rapport["PeriodeSousRevue"].as_str().unwrap_or(""),
            rapport["Fichier"].as_str().unwrap_or(""),
        ],
    ).map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn get_rapports(state: tauri::State<AppState>) -> Result<Vec<Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT * FROM Rapport ORDER BY DateRapport DESC").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "RapportID": row.get::<_, i64>(0)?,
            "LibelleRapport": row.get::<_, String>(1)?,
            "NumeroRapport": row.get::<_, String>(2)?,
            "DateRapport": row.get::<_, String>(3)?,
            "TypeInspection": row.get::<_, Option<String>>(4)?,
            "PeriodeSousRevue": row.get::<_, Option<String>>(5)?,
            "Fichier": row.get::<_, Option<String>>(6)?,
        }))
    }).map_err(|e| e.to_string())?;
    
    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn update_rapport(state: tauri::State<AppState>, rapport: Value) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE Rapport SET LibelleRapport=?1, NumeroRapport=?2, DateRapport=?3, 
         TypeInspection=?4, PeriodeSousRevue=?5, Fichier=?6 WHERE RapportID=?7",
        params![
            rapport["LibelleRapport"].as_str().unwrap_or(""),
            rapport["NumeroRapport"].as_str().unwrap_or(""),
            rapport["DateRapport"].as_str().unwrap_or(""),
            rapport["TypeInspection"].as_str().unwrap_or(""),
            rapport["PeriodeSousRevue"].as_str().unwrap_or(""),
            rapport["Fichier"].as_str().unwrap_or(""),
            rapport["RapportID"].as_i64().unwrap_or(0),
        ],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_rapport(state: tauri::State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM Rapport WHERE RapportID=?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ==================== DOSSIERS ====================
#[tauri::command]
fn create_dossier(state: tauri::State<AppState>, dossier: Value) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO Dossier (PersonnelID, TypeInconduite, PeriodeInconduite, Annee, 
         ServiceInvestigation, Etat, SuiteReservee, TypeSanction, Sanction, 
         ActeSanction, NumeroActeSanction, AutoriteSanction, Observations, IDRapport) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        params![
            dossier["PersonnelID"].as_i64().unwrap_or(0),
            dossier["TypeInconduite"].as_str().unwrap_or(""),
            dossier["PeriodeInconduite"].as_str().unwrap_or(""),
            dossier["Annee"].as_i64().unwrap_or(0),
            dossier["ServiceInvestigation"].as_str().unwrap_or(""),
            dossier["Etat"].as_str().unwrap_or("En cours"),
            dossier["SuiteReservee"].as_str().unwrap_or(""),
            dossier["TypeSanction"].as_str().unwrap_or(""),
            dossier["Sanction"].as_str().unwrap_or(""),
            dossier["ActeSanction"].as_str().unwrap_or(""),
            dossier["NumeroActeSanction"].as_str().unwrap_or(""),
            dossier["AutoriteSanction"].as_str().unwrap_or(""),
            dossier["Observations"].as_str().unwrap_or(""),
            dossier["IDRapport"].as_i64().unwrap_or(0),
        ],
    ).map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn get_dossiers(state: tauri::State<AppState>) -> Result<Vec<Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT d.*, a.Nom, a.Prenom, a.Matricule 
         FROM Dossier d 
         LEFT JOIN Agent a ON d.PersonnelID = a.PersonnelID 
         ORDER BY d.DossierID DESC"
    ).map_err(|e| e.to_string())?;
    
    let rows = stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "DossierID": row.get::<_, i64>(0)?,
            "PersonnelID": row.get::<_, i64>(1)?,
            "TypeInconduite": row.get::<_, Option<String>>(2)?,
            "PeriodeInconduite": row.get::<_, Option<String>>(3)?,
            "Annee": row.get::<_, Option<i64>>(4)?,
            "ServiceInvestigation": row.get::<_, Option<String>>(5)?,
            "Etat": row.get::<_, Option<String>>(6)?,
            "SuiteReservee": row.get::<_, Option<String>>(7)?,
            "TypeSanction": row.get::<_, Option<String>>(8)?,
            "Sanction": row.get::<_, Option<String>>(9)?,
            "ActeSanction": row.get::<_, Option<String>>(10)?,
            "NumeroActeSanction": row.get::<_, Option<String>>(11)?,
            "AutoriteSanction": row.get::<_, Option<String>>(12)?,
            "Observations": row.get::<_, Option<String>>(13)?,
            "IDRapport": row.get::<_, Option<i64>>(14)?,
            "AgentNom": row.get::<_, Option<String>>(15)?,
            "AgentPrenom": row.get::<_, Option<String>>(16)?,
            "AgentMatricule": row.get::<_, Option<String>>(17)?,
        }))
    }).map_err(|e| e.to_string())?;
    
    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn update_dossier(state: tauri::State<AppState>, dossier: Value) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE Dossier SET TypeInconduite=?1, PeriodeInconduite=?2, Annee=?3, 
         ServiceInvestigation=?4, Etat=?5, SuiteReservee=?6, TypeSanction=?7, 
         Sanction=?8, ActeSanction=?9, NumeroActeSanction=?10, AutoriteSanction=?11, 
         Observations=?12, IDRapport=?13 WHERE DossierID=?14",
        params![
            dossier["TypeInconduite"].as_str().unwrap_or(""),
            dossier["PeriodeInconduite"].as_str().unwrap_or(""),
            dossier["Annee"].as_i64().unwrap_or(0),
            dossier["ServiceInvestigation"].as_str().unwrap_or(""),
            dossier["Etat"].as_str().unwrap_or("En cours"),
            dossier["SuiteReservee"].as_str().unwrap_or(""),
            dossier["TypeSanction"].as_str().unwrap_or(""),
            dossier["Sanction"].as_str().unwrap_or(""),
            dossier["ActeSanction"].as_str().unwrap_or(""),
            dossier["NumeroActeSanction"].as_str().unwrap_or(""),
            dossier["AutoriteSanction"].as_str().unwrap_or(""),
            dossier["Observations"].as_str().unwrap_or(""),
            dossier["IDRapport"].as_i64().unwrap_or(0),
            dossier["DossierID"].as_i64().unwrap_or(0),
        ],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_dossier(state: tauri::State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM Dossier WHERE DossierID=?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ==================== RECOMMANDATIONS ====================
#[tauri::command]
fn create_recommandation(state: tauri::State<AppState>, recommandation: Value) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    
    conn.execute(
        "INSERT INTO Recommandation (Services, Source, RapportID, ProblemeFaiblesse, 
         NumeroRecommandation, TexteRecommandation, ResponsableMiseEnOeuvre, 
         ActeursImpliques, InstanceValidation, Echeance, Domaine) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            recommandation["Services"].as_str().unwrap_or(""),
            recommandation["Source"].as_str().unwrap_or(""),
            recommandation["RapportID"].as_i64().unwrap_or(0),
            recommandation["ProblemeFaiblesse"].as_str().unwrap_or(""),
            recommandation["NumeroRecommandation"].as_str().unwrap_or(""),
            recommandation["TexteRecommandation"].as_str().unwrap_or(""),
            recommandation["ResponsableMiseEnOeuvre"].as_str().unwrap_or(""),
            recommandation["ActeursImpliques"].as_str().unwrap_or(""),
            recommandation["InstanceValidation"].as_str().unwrap_or(""),
            recommandation["Echeance"].as_str().unwrap_or(""),
            recommandation["Domaine"].as_str().unwrap_or(""),
        ],
    ).map_err(|e| e.to_string())?;
    
    let id = conn.last_insert_rowid();
    conn.execute(
        "INSERT INTO SuiviRecommandation (RecommandationID, NiveauMiseEnOeuvre) VALUES (?1, 'Non commencé')",
        params![id],
    ).map_err(|e| e.to_string())?;
    
    Ok(id)
}

#[tauri::command]
fn get_recommandations(state: tauri::State<AppState>) -> Result<Vec<Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT r.*, s.NiveauMiseEnOeuvre, s.DateDebut, s.DateFin, s.MesuresCorrectives,
         s.ObservationDelai, s.ObservationMiseEnOeuvre, s.AppreciationControle,
         rap.NumeroRapport, rap.LibelleRapport
         FROM Recommandation r
         LEFT JOIN SuiviRecommandation s ON r.RecommandationID = s.RecommandationID
         LEFT JOIN Rapport rap ON r.RapportID = rap.RapportID
         ORDER BY r.RecommandationID DESC"
    ).map_err(|e| e.to_string())?;
    
    let rows = stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "RecommandationID": row.get::<_, i64>(0)?,
            "Services": row.get::<_, Option<String>>(1)?,
            "Source": row.get::<_, Option<String>>(2)?,
            "RapportID": row.get::<_, i64>(3)?,
            "ProblemeFaiblesse": row.get::<_, Option<String>>(4)?,
            "NumeroRecommandation": row.get::<_, Option<String>>(5)?,
            "TexteRecommandation": row.get::<_, String>(6)?,
            "ResponsableMiseEnOeuvre": row.get::<_, Option<String>>(7)?,
            "ActeursImpliques": row.get::<_, Option<String>>(8)?,
            "InstanceValidation": row.get::<_, Option<String>>(9)?,
            "Echeance": row.get::<_, Option<String>>(10)?,
            "Domaine": row.get::<_, Option<String>>(11)?,
            "NiveauMiseEnOeuvre": row.get::<_, Option<String>>(12)?,
            "DateDebut": row.get::<_, Option<String>>(13)?,
            "DateFin": row.get::<_, Option<String>>(14)?,
            "MesuresCorrectives": row.get::<_, Option<String>>(15)?,
            "ObservationDelai": row.get::<_, Option<String>>(16)?,
            "ObservationMiseEnOeuvre": row.get::<_, Option<String>>(17)?,
            "AppreciationControle": row.get::<_, Option<String>>(18)?,
            "NumeroRapport": row.get::<_, Option<String>>(19)?,
            "LibelleRapport": row.get::<_, Option<String>>(20)?,
        }))
    }).map_err(|e| e.to_string())?;
    
    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn update_suivi_recommandation(state: tauri::State<AppState>, suivi: Value) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE SuiviRecommandation SET MesuresCorrectives=?1, DateDebut=?2, DateFin=?3,
         NiveauMiseEnOeuvre=?4, ObservationDelai=?5, ObservationMiseEnOeuvre=?6,
         AppreciationControle=?7, ReferenceJustificatif=?8
         WHERE RecommandationID=?9",
        params![
            suivi["MesuresCorrectives"].as_str().unwrap_or(""),
            suivi["DateDebut"].as_str().unwrap_or(""),
            suivi["DateFin"].as_str().unwrap_or(""),
            suivi["NiveauMiseEnOeuvre"].as_str().unwrap_or("Non commencé"),
            suivi["ObservationDelai"].as_str().unwrap_or(""),
            suivi["ObservationMiseEnOeuvre"].as_str().unwrap_or(""),
            suivi["AppreciationControle"].as_str().unwrap_or(""),
            suivi["ReferenceJustificatif"].as_str().unwrap_or(""),
            suivi["RecommandationID"].as_i64().unwrap_or(0),
        ],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

// ==================== STATISTIQUES ====================
#[tauri::command]
fn get_statistiques(state: tauri::State<AppState>) -> Result<Value, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    
    let total_agents: i64 = conn.query_row("SELECT COUNT(*) FROM Agent", [], |row| row.get(0)).unwrap_or(0);
    let total_rapports: i64 = conn.query_row("SELECT COUNT(*) FROM Rapport", [], |row| row.get(0)).unwrap_or(0);
    let total_recommandations: i64 = conn.query_row("SELECT COUNT(*) FROM Recommandation", [], |row| row.get(0)).unwrap_or(0);
    let total_dossiers: i64 = conn.query_row("SELECT COUNT(*) FROM Dossier", [], |row| row.get(0)).unwrap_or(0);
    
    let recommandations_realisees: i64 = conn.query_row(
        "SELECT COUNT(*) FROM SuiviRecommandation WHERE NiveauMiseEnOeuvre = 'Réalisée'",
        [], |row| row.get(0)
    ).unwrap_or(0);
    
    let recommandations_en_cours: i64 = conn.query_row(
        "SELECT COUNT(*) FROM SuiviRecommandation WHERE NiveauMiseEnOeuvre = 'En cours'",
        [], |row| row.get(0)
    ).unwrap_or(0);
    
    Ok(serde_json::json!({
        "totalAgents": total_agents,
        "totalRapports": total_rapports,
        "totalRecommandations": total_recommandations,
        "totalDossiers": total_dossiers,
        "recommandationsRealisees": recommandations_realisees,
        "recommandationsEnCours": recommandations_en_cours,
        "recommandationsNonRealisees": total_recommandations - recommandations_realisees - recommandations_en_cours,
    }))
}

// ==================== GRADES ====================
#[tauri::command]
fn get_grades(state: tauri::State<AppState>) -> Result<Vec<Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT GradeID, LibelleGrade FROM Grade ORDER BY Ordre").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "GradeID": row.get::<_, i64>(0)?,
            "LibelleGrade": row.get::<_, String>(1)?,
        }))
    }).map_err(|e| e.to_string())?;
    
    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn create_grade(state: tauri::State<AppState>, libelle: String, ordre: i64) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO Grade (LibelleGrade, Ordre) VALUES (?1, ?2)",
        params![libelle, ordre],
    ).map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn update_grade(state: tauri::State<AppState>, grade_id: i64, libelle: String, ordre: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE Grade SET LibelleGrade=?1, Ordre=?2 WHERE GradeID=?3",
        params![libelle, ordre, grade_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_grade(state: tauri::State<AppState>, grade_id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM Grade WHERE GradeID=?1", params![grade_id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ==================== SANCTIONS ====================
#[tauri::command]
fn get_sanctions(state: tauri::State<AppState>) -> Result<Vec<Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT SanctionID, LibelleSanction, Niveau FROM Sanction ORDER BY Niveau").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "SanctionID": row.get::<_, i64>(0)?,
            "LibelleSanction": row.get::<_, String>(1)?,
            "Niveau": row.get::<_, Option<i64>>(2)?,
        }))
    }).map_err(|e| e.to_string())?;
    
    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn create_sanction(state: tauri::State<AppState>, libelle: String, niveau: i64) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO Sanction (LibelleSanction, Niveau) VALUES (?1, ?2)",
        params![libelle, niveau],
    ).map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn update_sanction(state: tauri::State<AppState>, sanction_id: i64, libelle: String, niveau: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE Sanction SET LibelleSanction=?1, Niveau=?2 WHERE SanctionID=?3",
        params![libelle, niveau, sanction_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_sanction(state: tauri::State<AppState>, sanction_id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM Sanction WHERE SanctionID=?1", params![sanction_id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ==================== SERVICES INVESTIGATION ====================
#[tauri::command]
fn get_services_investigation(state: tauri::State<AppState>) -> Result<Vec<Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT ServiceID, LibelleService, Acronyme FROM ServiceInvestigation WHERE Actif = 1 ORDER BY Ordre").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "ServiceID": row.get::<_, i64>(0)?,
            "LibelleService": row.get::<_, String>(1)?,
            "Acronyme": row.get::<_, Option<String>>(2)?,
        }))
    }).map_err(|e| e.to_string())?;
    
    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn create_service_investigation(state: tauri::State<AppState>, libelle: String, acronyme: String, ordre: i64) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO ServiceInvestigation (LibelleService, Acronyme, Ordre) VALUES (?1, ?2, ?3)",
        params![libelle, acronyme, ordre],
    ).map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn update_service_investigation(state: tauri::State<AppState>, service_id: i64, libelle: String, acronyme: String, ordre: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE ServiceInvestigation SET LibelleService=?1, Acronyme=?2, Ordre=?3 WHERE ServiceID=?4",
        params![libelle, acronyme, ordre, service_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_service_investigation(state: tauri::State<AppState>, service_id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE ServiceInvestigation SET Actif = 0 WHERE ServiceID=?1", params![service_id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ==================== EN-TÊTE ====================
#[tauri::command]
fn get_entete_config(state: tauri::State<AppState>, composant: String) -> Result<Vec<Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT ConfigID, Composant, Champ, Valeur, Ordre, Actif FROM EnteteConfig WHERE Composant = ?1 ORDER BY Ordre"
    ).map_err(|e| e.to_string())?;
    
    let rows = stmt.query_map([composant], |row| {
        Ok(serde_json::json!({
            "ConfigID": row.get::<_, i64>(0)?,
            "Composant": row.get::<_, String>(1)?,
            "Champ": row.get::<_, String>(2)?,
            "Valeur": row.get::<_, Option<String>>(3)?,
            "Ordre": row.get::<_, i64>(4)?,
            "Actif": row.get::<_, i64>(5)?,
        }))
    }).map_err(|e| e.to_string())?;
    
    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn update_entete_config(state: tauri::State<AppState>, config_id: i64, valeur: String, actif: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE EnteteConfig SET Valeur=?1, Actif=?2 WHERE ConfigID=?3",
        params![valeur, actif, config_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn add_entete_config(state: tauri::State<AppState>, composant: String, champ: String, valeur: String, ordre: i64) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO EnteteConfig (Composant, Champ, Valeur, Ordre) VALUES (?1, ?2, ?3, ?4)",
        params![composant, champ, valeur, ordre],
    ).map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

// ==================== LOGS ====================
#[tauri::command]
fn add_log(state: tauri::State<AppState>, utilisateur: String, action: String, table: String, enregistrement_id: i64, details: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO Logs (Utilisateur, Action, TableConcernee, EnregistrementID, Details, DateLog) VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))",
        params![utilisateur, action, table, enregistrement_id, details],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

// ==================== MAIN ====================
fn main() {
    let db = init_db().expect("Failed to initialize database");
    
    tauri::Builder::default()
        .manage(AppState { db: Mutex::new(db) })
        .invoke_handler(tauri::generate_handler![
            create_agent, get_agents, update_agent, delete_agent,
            create_rapport, get_rapports, update_rapport, delete_rapport,
            create_dossier, get_dossiers, update_dossier, delete_dossier,
            create_recommandation, get_recommandations, update_suivi_recommandation,
            get_statistiques,
            get_grades, create_grade, update_grade, delete_grade,
            get_sanctions, create_sanction, update_sanction, delete_sanction,
            get_services_investigation, create_service_investigation, update_service_investigation, delete_service_investigation,
            get_entete_config, update_entete_config, add_entete_config,
            get_logs,
            add_log
        ])
        .run(generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn get_logs(state: tauri::State<AppState>, limit: Option<i64>) -> Result<Vec<Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let limit_val = limit.unwrap_or(100);
    let mut stmt = conn.prepare(
        "SELECT LogID, Utilisateur, Action, TableConcernee, EnregistrementID, DateLog, Details 
         FROM Logs 
         ORDER BY DateLog DESC 
         LIMIT ?1"
    ).map_err(|e| e.to_string())?;
    
    let rows = stmt.query_map([limit_val], |row| {
        Ok(serde_json::json!({
            "LogID": row.get::<_, i64>(0)?,
            "Utilisateur": row.get::<_, Option<String>>(1)?,
            "Action": row.get::<_, String>(2)?,
            "TableConcernee": row.get::<_, String>(3)?,
            "EnregistrementID": row.get::<_, i64>(4)?,
            "DateLog": row.get::<_, String>(5)?,
            "Details": row.get::<_, Option<String>>(6)?,
        }))
    }).map_err(|e| e.to_string())?;
    
    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}