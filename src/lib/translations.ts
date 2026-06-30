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
  },
  low: {
    english: "Low",
    tamil: "குறைந்த",
    tanglish: "Low"
  },
  medium: {
    english: "Medium",
    tamil: "நடுத்தர",
    tanglish: "Medium"
  },
  high: {
    english: "High",
    tamil: "அதிக",
    tanglish: "High"
  },
  custom: {
    english: "Custom",
    tamil: "தனிப்பயன்",
    tanglish: "Custom"
  },
  generic: {
    english: "Generic",
    tamil: "பொதுவானது",
    tanglish: "Generic"
  },
  customOnly: {
    english: "Custom Only",
    tamil: "தனிப்பயன் மட்டும்",
    tanglish: "Custom Only"
  },
  dictionaryHeader: {
    english: "Code Dictionary",
    tamil: "குறியீடு அகராதி",
    tanglish: "Code Dictionary"
  },
  addCustomBtn: {
    english: "Add Custom Code",
    tamil: "தனிப்பயன் குறியீட்டைச் சேர்",
    tanglish: "Add Custom Code"
  },
  backBtn: {
    english: "Back",
    tamil: "பின்செல்",
    tanglish: "Back"
  },
  cancelBtn: {
    english: "Cancel",
    tamil: "ரத்து செய்",
    tanglish: "Cancel"
  },
  searchDtcPlaceholder: {
    english: "Search code...",
    tamil: "குறியீட்டைத் தேடுக...",
    tanglish: "Search code..."
  },
  allOption: {
    english: "All",
    tamil: "அனைத்தும்",
    tanglish: "All"
  },
  importCsvBtn: {
    english: "Import CSV",
    tamil: "CSV இறக்குமதி",
    tanglish: "Import CSV"
  },
  exportBtn: {
    english: "Export",
    tamil: "ஏற்றுமதி",
    tanglish: "Export"
  },
  brandLabel: {
    english: "Brand",
    tamil: "வகை",
    tanglish: "Brand"
  },
  dtcCodeLabel: {
    english: "DTC Code *",
    tamil: "DTC குறியீடு *",
    tanglish: "DTC Code *"
  },
  faultTitleLabel: {
    english: "Fault Title *",
    tamil: "பழுது தலைப்பு *",
    tanglish: "Fault Title *"
  },
  motorcycleBrandLabel: {
    english: "Motorcycle Brand *",
    tamil: "இருசக்கர வாகன பிராண்ட் *",
    tanglish: "Motorcycle Brand *"
  },
  severityLevelLabel: {
    english: "Severity Level *",
    tamil: "தீவிர நிலை *",
    tanglish: "Severity Level *"
  },
  systemCategoryLabel: {
    english: "Category / System",
    tamil: "வகை / மின் அமைப்பு",
    tanglish: "Category / System"
  },
  componentLocationLabel: {
    english: "Component Location",
    tamil: "பாகத்தின் அமைவிடம்",
    tanglish: "Component Location"
  },
  problemDescriptionLabel: {
    english: "Problem Description",
    tamil: "பிரச்சனை விளக்கம்",
    tanglish: "Problem Description"
  },
  symptomsLabel: {
    english: "Symptoms (one per line)",
    tamil: "அறிகுறிகள் (வரியொன்றிற்கு ஒன்று)",
    tanglish: "Symptoms (one per line)"
  },
  causesLabel: {
    english: "Possible Causes (one per line)",
    tamil: "சாத்தியமான காரணங்கள்",
    tanglish: "Possible Causes"
  },
  fixesLabel: {
    english: "Recommended Fixes (one per line)",
    tamil: "பரிந்துரைக்கப்பட்ட தீர்வுகள்",
    tanglish: "Recommended Fixes"
  },
  saveToDbBtn: {
    english: "Save Code to Database",
    tamil: "தரவுத்தளத்தில் சேமிக்கவும்",
    tanglish: "Save Code to Database"
  },
  savingLoader: {
    english: "Saving...",
    tamil: "சேமிக்கப்படுகிறது...",
    tanglish: "Saving..."
  },
  settingsDescription: {
    english: "Manage your account settings and application preferences.",
    tamil: "உங்கள் கணக்கு மற்றும் ஆப் அமைப்புகளை நிர்வகிக்கவும்.",
    tanglish: "Account settings mattrum App preferences-ai manage pannunga."
  },
  customizeAppAppearance: {
    english: "Customize how the app looks for you.",
    tamil: "ஆப் எப்படி தெரிய வேண்டும் என்பதை முடிவு செய்யுங்கள்.",
    tanglish: "App-in appearance-ai customize pannunga."
  },
  dataManagement: {
    english: "Data Management",
    tamil: "தரவு மேலாண்மை",
    tanglish: "Data Management"
  },
  dataManagementDesc: {
    english: "Import or export your OBD codes and application data.",
    tamil: "உங்கள் OBD கோடுகள் மற்றும் டேட்டாவை இறக்குமதி அல்லது ஏற்றுமதி செய்யவும்.",
    tanglish: "OBD codes mattrum application data-ai import alladhu export pannunga."
  },
  importDataDesc: {
    english: "Upload a CSV file to add multiple codes at once.",
    tamil: "அனைத்து கோடுகளையும் ஒரே நேரத்தில் சேர்க்க CSV கோப்பை பதிவேற்றவும்.",
    tanglish: "Orey nerathil codes-ai add seiya CSV file-ai upload pannunga."
  },
  chooseFileBtn: {
    english: "Choose File",
    tamil: "கோப்பைத் தேர்ந்தெடு",
    tanglish: "Choose File"
  },
  exportDataDesc: {
    english: "Download all your saved codes as a CSV file for backup.",
    tamil: "பாதுகாப்பிற்காக உங்கள் அனைத்து கோடுகளையும் CSV கோப்பாக பதிவிறக்கவும்.",
    tanglish: "Unangaludaiya saved codes-ai backup-kaga CSV file-aga download pannunga."
  },
  backToSearch: {
    english: "Back to Search",
    tamil: "தேடலுக்குத் திரும்பு",
    tanglish: "Back to Search"
  },
  newDiagnosticCode: {
    english: "New Diagnostic Code",
    tamil: "புதிய தொழில்நுட்பக் குறியீடு",
    tanglish: "New DTC Code"
  },
  editDiagnosticCode: {
    english: "Edit Diagnostic Code",
    tamil: "தொழில்நுட்பக் குறியீட்டைத் திருத்து",
    tanglish: "Edit DTC Code"
  },
  newDiagnosticCodeDesc: {
    english: "Add a code to the shared global dictionary.",
    tamil: "பகிரப்பட்ட பொதுவான அகராதியில் ஒரு குறியீட்டைச் சேர்க்கவும்.",
    tanglish: "Shared dictionary-il code-ai add pannuga."
  },
  editDiagnosticCodeDesc: {
    english: "Modify code details and save changes.",
    tamil: "குறியீட்டின் விவரங்களை மாற்றி சேமிக்கவும்.",
    tanglish: "Code details-ai modify pannunga."
  },
  updateCodeBtn: {
    english: "Update Code",
    tamil: "குறியீட்டைப் புதுப்பி",
    tanglish: "Code-ai Update sei"
  },
  categoryPlaceholder: {
    english: "e.g. Engine, Throttle, ABS",
    tamil: "எ.கா. எஞ்சின், த்ராட்டில், ஏபிஎஸ்",
    tanglish: "e.g. Engine, Throttle, ABS"
  },
  locationPlaceholder: {
    english: "e.g. Engine front - Left side",
    tamil: "எ.கா. எஞ்சின் முன் பகுதி - இடது பக்கம்",
    tanglish: "e.g. Engine front - Left side"
  },
  problemDescriptionPlaceholder: {
    english: "Briefly describe what this fault means...",
    tamil: "இந்த பழுது எதைக் குறிக்கிறது என்பதை விளக்கவும்...",
    tanglish: "Indha fault enna endru vilakkuga..."
  },
  lowSeverity: {
    english: "Low (Info)",
    tamil: "குறைந்த (தகவல்)",
    tanglish: "Low (Info)"
  },
  mediumSeverity: {
    english: "Medium (Warning)",
    tamil: "நடுத்தர (எச்சரிக்கை)",
    tanglish: "Medium (Warning)"
  },
  highSeverity: {
    english: "High (Critical)",
    tamil: "அதிக (ஆபத்தானது)",
    tanglish: "High (Critical)"
  },
  allCodesLabel: {
    english: "Total Codes",
    tamil: "மொத்த குறியீடுகள்",
    tanglish: "Total Codes"
  },
  noCodesMatch: {
    english: "No codes match your filter.",
    tamil: "வடிகட்டிக்கு பொருந்தும் குறியீடுகள் இல்லை.",
    tanglish: "Codes eduvum match aagavillai."
  },
  diagnosticCode: {
    english: "Diagnostic Code",
    tamil: "தொழில்நுட்ப பழுது குறியீடு",
    tanglish: "Diagnostic Code"
  }
};

// Title stays as-is — full translation handled by Gemini + obd_translations cache
export function translateDTCTitle(title: string, _language: Language): string {
  return title;
}

