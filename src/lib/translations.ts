export type Language = "english" | "tamil" | "tanglish";

interface Translations {
  [key: string]: {
    english: string;
    tamil: string;
    tanglish: string;
  };
}

export const translations: Translations = {
  dashboard: {
    english: "Dashboard",
    tamil: "தகவல்தளம்",
    tanglish: "Dashboard"
  },
  activeUsers: {
    english: "Code Base",
    tamil: "குறியீடுகள்",
    tanglish: "Code Base"
  },
  newCredentials: {
    english: "New Credentials",
    tamil: "புதிய கணக்கு",
    tanglish: "Pudhiya Kanakku"
  },
  settings: {
    english: "Settings",
    tamil: "அமைப்புகள்",
    tanglish: "Settings"
  },
  signOut: {
    english: "Logout",
    tamil: "வெளியேறு",
    tanglish: "Logout"
  },
  searchPlaceholder: {
    english: "Search by code...",
    tamil: "குறியீட்டைத் தேடுக...",
    tanglish: "Code-ai theduga..."
  },
  analyze: {
    english: "Analyze",
    tamil: "ஆய்வு செய்",
    tanglish: "Analyze sei"
  },
  selectBrand: {
    english: "Select Vehicle Brand",
    tamil: "வாகன வகையைத் தேர்ந்தெடுக்கவும்",
    tanglish: "Brand-ai select pannuga"
  },
  history: {
    english: "Recent History",
    tamil: "சமீபத்திய தேடல்கள்",
    tanglish: "History"
  },
  generalAppearance: {
    english: "General Appearance",
    tamil: "பொதுவான தோற்றம்",
    tanglish: "Appearance"
  },
  theme: {
    english: "Interface Theme",
    tamil: "திரை நிறம்",
    tanglish: "Theme"
  },
  accountSecurity: {
    english: "Account Security",
    tamil: "கணக்கு பாதுகாப்பு",
    tanglish: "Security"
  },
  manageWorkshops: {
    english: "Manage Workshop Accounts",
    tamil: "ஒர்க்ஷாப் கணக்குகளை நிர்வகி",
    tanglish: "Workshop Management"
  },
  profile: {
    english: "Profile",
    tamil: "சுயவிவரம்",
    tanglish: "Profile"
  },
  appearance: {
    english: "Appearance",
    tamil: "தோற்றம்",
    tanglish: "Appearance"
  },
  generalData: {
    english: "General & Data",
    tamil: "தகவல்கள்",
    tanglish: "General & Data"
  },
  profileInfo: {
    english: "Profile Information",
    tamil: "சுயவிவரத் தகவல்கள்",
    tanglish: "Profile Information"
  },
  updateDetails: {
    english: "Update your personal details.",
    tamil: "உங்கள் தனிப்பட்ட தகவல்களைப் புதுப்பிக்கவும்.",
    tanglish: "Personal details-ai update pannuga."
  },
  fullName: {
    english: "Full Name",
    tamil: "முழு பெயர்",
    tanglish: "Mulu Peyar"
  },
  occupation: {
    english: "Role / Occupation",
    tamil: "பதவி / வேலை",
    tanglish: "Role / Velai"
  },
  saveChanges: {
    english: "Save Changes",
    tamil: "மாற்றங்களைச் சேமி",
    tanglish: "Changes-ai Save sei"
  },
  darkMode: {
    english: "Dark Mode",
    tamil: "டார்க் மோட்",
    tanglish: "Dark Mode"
  },
  switchThemes: {
    english: "Switch between dark and light themes.",
    tamil: "டார்க் மற்றும் லைட் தீம்களுக்கு மாறவும்.",
    tanglish: "Dark mattrum Light theme-ku maaruga."
  },
  importData: {
    english: "Import CSV Data",
    tamil: "CSV தகவல்களை இறக்குமதி செய்",
    tanglish: "Data-ai Import sei"
  },
  exportData: {
    english: "Export All Data",
    tamil: "அனைத்துத் தகவல்களையும் ஏற்றுமதி செய்",
    tanglish: "Data-ai Export sei"
  },
  affectedPart: {
    english: "Affected Part",
    tamil: "பாதிக்கப்பட்ட பகுதி",
    tanglish: "Affected Part"
  },
  symptoms: {
    english: "Symptoms",
    tamil: "அறிகுறிகள்",
    tanglish: "Symptoms"
  },
  location: {
    english: "Place / Location",
    tamil: "இடம் / அமைவிடம்",
    tanglish: "Location"
  },
  actions: {
    english: "Solution / Fixes",
    tamil: "தீர்வு / சரிசெய்தல்",
    tanglish: "Solution / Fixes"
  },
  noDataFound: {
    english: "No Data Found",
    tamil: "தகவல் இல்லை",
    tanglish: "Data Eduvum Illai"
  },
  noDataDescription: {
    english: "Code {code} not found in {brand} or Global OBD2 database.",
    tamil: "குறியீடு {code}, {brand} அல்லது பொதுவான OBD2 தரவுத்தளத்தில் இல்லை.",
    tanglish: "Code {code}, {brand} alladhu Global OBD2 database-il illai."
  },
  suggestedNextStep: {
    english: "Suggested Next Step",
    tamil: "அடுத்த கட்ட நடவடிக்கை",
    tanglish: "Adutha Step"
  },
  suggestedAction1: {
    english: "Wiring harness & connectors check.",
    tamil: "ஒயரிங் ஹார்னஸ் மற்றும் கனெக்டர்களைச் சரிபார்க்கவும்.",
    tanglish: "Wiring harness & connectors-ai check pannunga."
  },
  suggestedAction2: {
    english: "Battery voltage & ground points verify.",
    tamil: "பேட்டரி மின்னழுத்தம் மற்றும் எர்த் பாயிண்டுகளைச் சரிபார்க்கவும்.",
    tanglish: "Battery voltage & ground points-ai verify pannunga."
  },
  suggestedAction3: {
    english: "Cross-check with manufacturer service manual.",
    tamil: "உற்பத்தியாளரின் சேவை கையேட்டைச் சரிபார்க்கவும்.",
    tanglish: "Manufacturer service manual-ai cross-check pannunga."
  },
  severityLabel: {
    english: "Severity",
    tamil: "தீவிரம்",
    tanglish: "Severity"
  },
  defaultLocation: {
    english: "Refer to service manual for component location.",
    tamil: "பாகத்தின் அமைவிடத்தை அறிய சேவை கையேட்டைப் பார்க்கவும்.",
    tanglish: "Component location-ku service manual-ai paarunga."
  }
};
