# CY Team Task Status

This is the starter web application for the internal daily task arrangement system.

## Connect Google Sheets

1. Open your blank Google Sheet and select **Extensions > Apps Script**.
2. Copy the contents of `Code.gs` into the Apps Script editor, replacing its default code.
3. Click **Save**, select `setup` from the function list, and click **Run**. Approve the Google permissions. This creates an `AppData` tab.
4. Select **Deploy > New deployment**, choose **Web app**, execute as **Me**, and allow access to **Anyone with the link**.
5. Copy the deployment URL into `API_URL` at the top of `app.js`.
6. Open `index.html` again. Changes will now be saved to the Sheet and shared between computers.

The current starter also keeps a browser copy as a fallback. Google Drive image uploads will be added after the Sheet connection is confirmed.
