# Photoswitch ROI Analyzer

A pure frontend React/Vite web app for Nikon microscope photo switching ROI intensity analysis. It does **not** read ND2 files, does **not** select ROIs, and does **not** require a backend server. Users paste tables or import local CSV/XLSX files; all parsing, normalization, cycle analysis, plotting, export, and experiment saving happen in the browser.

## Features

- App name: **Photoswitch ROI Analyzer**
- Local-only workflow: no data upload, no backend API, localStorage experiment records.
- Input methods:
  - Paste long format tables from Excel/Fiji/Nikon.
  - Paste wide format tables where the first column is `frame` and subsequent columns are ROIs.
  - Import local `.csv`, `.xlsx`, or `.xls` files.
- Standard preview columns: `mutant`, `roi`, `frame`, `time_s`, `intensity`, `background`, `F_corrected`.
- Analysis modes:
  1. Single switching normalization
  2. 10-cycle fatigue
  3. 10-cycle photobleaching
  4. Mutant comparison
- Recharts plots with controls for x-axis, value type, mutant, ROI, representative ROI, and mean ± SD.
- Exports:
  - Normalized trace CSV
  - Summary CSV
  - All results XLSX
  - Current chart PNG
- Local experiment management:
  - Save experiment locally
  - Load saved experiment
  - Delete saved experiment
  - Clear current data


## Deploy directly on GitHub Pages

Yes. You can deploy this app on GitHub Pages without running it locally. The repository includes a GitHub Actions workflow that builds `photoswitch-web-app` and publishes the generated `dist` folder to Pages.

1. Push this repository to GitHub.
2. Open the repository on GitHub.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to **GitHub Actions**.
5. Go to **Actions** and run **Deploy Photoswitch ROI Analyzer to GitHub Pages**, or push to `main`/`master` to trigger it automatically.
6. After the workflow succeeds, open the Pages URL, usually `https://<your-user-name>.github.io/<your-repo-name>/`.

For a project page such as `https://yiningyao.github.io/Quick-Trans/`, Vite must use the repository name as its base path. `photoswitch-web-app/vite.config.js` reads GitHub's `GITHUB_REPOSITORY` environment variable during Actions builds and automatically sets the correct base path, for example `/Quick-Trans/` or `/nd2/`.


### If the workflow is not visible in GitHub Actions

If you do not see **Deploy Photoswitch ROI Analyzer to GitHub Pages** in the GitHub **Actions** tab, it usually means GitHub has not received this workflow file on the repository's default branch yet. Check these points:

1. Make sure `.github/workflows/deploy-photoswitch-web-app.yml` exists in your GitHub repository, not only in a local copy or an unmerged pull request.
2. If the workflow was added in a pull request, merge the pull request into the default branch first, or push the branch that contains the workflow file.
3. Open **Actions** and enable workflows if GitHub shows a banner saying Actions are disabled for the repository.
4. Open **Settings → Pages** and set **Source** to **GitHub Actions**.
5. After the workflow file is on `main` or `master`, push one more small commit or open **Actions** again; the workflow should appear and can also be run manually with **workflow_dispatch**.

You can also confirm the file is present on GitHub by opening this path in the repository file browser:

```text
.github/workflows/deploy-photoswitch-web-app.yml
```

## Install

```bash
cd /workspace/nd2/photoswitch-web-app
npm install
```

## Run development server

```bash
npm run dev
```

Then open the local Vite URL shown in the terminal, usually `http://localhost:5173`.

## Build

```bash
npm run build
```

## Example long format data

Paste this into the data input box:

```text
mutant	roi	frame	intensity	background
WT	ROI1	1	12000	300
WT	ROI1	2	11500	300
WT	ROI1	3	10900	300
WT	ROI2	1	13000	320
WT	ROI2	2	12500	320
WT	ROI2	3	11900	320
WT	ROI3	1	12800	310
WT	ROI3	2	12100	310
WT	ROI3	3	11600	310
```

## Example wide format data

```text
frame	ROI1	ROI2	ROI3	ROI4	ROI5
1	12000	13000	12800	11000	11800
2	11500	12500	12100	10400	11100
3	10800	11900	11600	9900	10500
```

## How to use

1. Open the app in the browser.
2. Set the experiment name and analysis parameters on the left.
3. Paste a table or import a local CSV/XLSX file.
4. Confirm the parsed long-format preview table.
5. Click **Run Analysis**.
6. Review normalized trace tables, summary tables, and Recharts plots.
7. Export CSV/XLSX/PNG outputs as needed.
8. Click **Save experiment locally** if you want to continue later from browser localStorage.

## Project structure

```text
photoswitch-web-app/
  package.json
  index.html
  src/
    main.jsx
    App.jsx
    components/
      DataInput.jsx
      SettingsPanel.jsx
      DataPreview.jsx
      ResultsTable.jsx
      ChartPanel.jsx
      SavedExperiments.jsx
    utils/
      parser.js
      analysis.js
      cycleUtils.js
      exportUtils.js
      storageUtils.js
    styles/
      App.css
```
