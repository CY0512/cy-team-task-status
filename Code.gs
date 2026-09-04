const SPREADSHEET_ID = "1Fi82_iaUM8FpwOaXrH56aKFfWfJXZowfY-p2g2NwMM8";
const DATA_SHEET = "AppData";

function setup() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(DATA_SHEET);
  if (!sheet) sheet = spreadsheet.insertSheet(DATA_SHEET);
  sheet.clear();
  sheet.getRange("A1:B2").setValues([
    ["key", "value"],
    ["state", JSON.stringify({ days: {}, clients: [] })],
  ]);
  sheet.setFrozenRows(1);
}

function doGet() {
  return jsonResponse(readState());
}

function doPost(event) {
  if (!event || !event.postData || !event.postData.contents) {
    throw new Error("A JSON request body is required.");
  }
  const payload = JSON.parse(event.postData.contents);
  if (!payload || typeof payload !== "object") throw new Error("Invalid state payload.");
  writeState({ days: payload.days || {}, clients: payload.clients || [] });
  return jsonResponse({ ok: true });
}

function readState() {
  const sheet = getDataSheet();
  const value = sheet.getRange("B2").getValue();
  return value ? JSON.parse(value) : { days: {}, clients: [] };
}

function writeState(state) {
  getDataSheet().getRange("B2").setValue(JSON.stringify(state));
}

function getDataSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(DATA_SHEET);
  if (!sheet) {
    setup();
    sheet = spreadsheet.getSheetByName(DATA_SHEET);
  }
  return sheet;
}

function jsonResponse(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
