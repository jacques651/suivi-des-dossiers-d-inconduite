use tauri::command;
use rusqlite::Connection;
use serde::{Serialize, Deserialize};
use crate::db::AppState;

#[derive(Debug, Serialize, Deserialize)]
pub struct Agent {
    pub PersonnelID: Option<i64>,
    pub Matricule: String,
    pub Cle: Option<String>,
    pub Nom: String,
    pub Prenom: String,
    pub GradeID: Option<i64>,
    pub Service: Option<String>,
    pub Entite: Option<String>,
    pub Sexe: Option<String>,
    pub Photo: Option<String>,
}

#[command]
pub fn create_agent(state: tauri::State<'_, AppState>, agent: Agent) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    
    conn.execute(
        "INSERT INTO Agent (Matricule, Cle, Nom, Prenom, GradeID, Service, Entite, Sexe, Photo) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        (
            &agent.Matricule, &agent.Cle, &agent.Nom, &agent.Prenom,
            &agent.GradeID, &agent.Service, &agent.Entite, &agent.Sexe, &agent.Photo
        ),
    ).map_err(|e| e.to_string())?;
    
    Ok(conn.last_insert_rowid())
}

#[command]
pub fn get_agents(state: tauri::State<'_, AppState>) -> Result<Vec<Agent>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT * FROM Agent").map_err(|e| e.to_string())?;
    let agents = stmt.query_map([], |row| {
        Ok(Agent {
            PersonnelID: row.get(0)?,
            Matricule: row.get(1)?,
            Cle: row.get(2)?,
            Nom: row.get(3)?,
            Prenom: row.get(4)?,
            GradeID: row.get(5)?,
            Service: row.get(6)?,
            Entite: row.get(7)?,
            Sexe: row.get(8)?,
            Photo: row.get(9)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut result = Vec::new();
    for agent in agents {
        result.push(agent.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[command]
pub fn update_agent(state: tauri::State<'_, AppState>, agent: Agent) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    
    conn.execute(
        "UPDATE Agent SET Matricule=?1, Cle=?2, Nom=?3, Prenom=?4, GradeID=?5, 
         Service=?6, Entite=?7, Sexe=?8, Photo=?9 WHERE PersonnelID=?10",
        (
            &agent.Matricule, &agent.Cle, &agent.Nom, &agent.Prenom,
            &agent.GradeID, &agent.Service, &agent.Entite, &agent.Sexe,
            &agent.Photo, &agent.PersonnelID
        ),
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[command]
pub fn delete_agent(state: tauri::State<'_, AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM Agent WHERE PersonnelID=?1", [id]).map_err(|e| e.to_string())?;
    Ok(())
}