use tauri::command;
use serde::{Serialize, Deserialize};
use crate::db::AppState;

#[derive(Debug, Serialize, Deserialize)]
pub struct Rapport {
    pub RapportID: Option<i64>,
    pub LibelleRapport: String,
    pub NumeroRapport: String,
    pub DateRapport: String,
    pub TypeInspection: Option<String>,
    pub PeriodeSousRevue: Option<String>,
    pub Fichier: Option<String>,
}

#[command]
pub fn create_rapport(state: tauri::State<'_, AppState>, rapport: Rapport) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    
    conn.execute(
        "INSERT INTO Rapport (LibelleRapport, NumeroRapport, DateRapport, TypeInspection, PeriodeSousRevue, Fichier) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        (
            &rapport.LibelleRapport, &rapport.NumeroRapport, &rapport.DateRapport,
            &rapport.TypeInspection, &rapport.PeriodeSousRevue, &rapport.Fichier
        ),
    ).map_err(|e| e.to_string())?;
    
    Ok(conn.last_insert_rowid())
}

#[command]
pub fn get_rapports(state: tauri::State<'_, AppState>) -> Result<Vec<Rapport>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT * FROM Rapport ORDER BY DateRapport DESC").map_err(|e| e.to_string())?;
    let rapports = stmt.query_map([], |row| {
        Ok(Rapport {
            RapportID: row.get(0)?,
            LibelleRapport: row.get(1)?,
            NumeroRapport: row.get(2)?,
            DateRapport: row.get(3)?,
            TypeInspection: row.get(4)?,
            PeriodeSousRevue: row.get(5)?,
            Fichier: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut result = Vec::new();
    for rapport in rapports {
        result.push(rapport.map_err(|e| e.to_string())?);
    }
    Ok(result)
}