export interface Grade {
  GradeID: number;
  LibelleGrade: string;
  Ordre?: number;
}

export interface Sanction {
  SanctionID: number;
  LibelleSanction: string;
  Niveau?: number;
  Categorie?: string;
}

export interface Signataire {
  SignataireID: number;
  Nom: string;
  Prenom: string;
  Grade?: string;
  Fonction: string;
  TitreHonorifique?: string;
  Statut: number;
  Ordre?: number;
}

export interface ServiceInvestigation {
  ServiceID: number;
  LibelleService: string;
  Acronyme?: string;
  Ordre?: number;
  Actif?: number;
}

export interface EnteteDocument {
  EnteteID: number;
  TypeDocument: string;
  Champ: string;
  Valeur: string;
  Ordre: number;
  Actif: number;
  Style?: string;
}

export interface ParametreGeneral {
  ParametreID: number;
  Code: string;
  Valeur: string;
  Description: string;
  UpdatedAt: string;
  UpdatedBy?: string;
}

export interface Log {
  LogID: number;
  Utilisateur: string;
  Action: string;
  TableConcernee: string;
  EnregistrementID: number;
  AnciennesValeurs?: string;
  NouvellesValeurs?: string;
  AdresseIP?: string;
  DateLog: string;
  Details: string;
}