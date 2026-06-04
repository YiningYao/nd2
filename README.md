# Photoswitch ROI Analyzer

A pure frontend React/Vite web app for Nikon microscope photo switching ROI intensity normalization. It does **not** read ND2 files, does **not** select ROIs, and does **not** require a backend server. Users paste an Excel range or import local CSV/XLSX files; all normalization, formula generation, export, and experiment saving happen in the browser.

## Current workflow: Excel layout in, Excel layout out

The app is now designed for the way you actually work in Excel:

1. Copy an Excel block containing ROI intensity values.
2. Paste it into the web app.
3. Choose the normalization formula template.
4. Choose how many cycles the table contains.
5. Click **Normalize**.
6. Copy the tab-delimited output block and paste it directly back into Excel, or download an XLSX workbook.

There is no separate long-format preview table in this workflow. The output is an Excel-style grid so it can be pasted back into Excel with the same row/column layout.

## Normalization templates

The app can generate calculated normalized values or Excel formulas. Formula references assume the pasted block starts at Excel cell `A1`.

Available templates include:

- **Column baseline: first data row** — examples: `B3/B$3`, `B4/B$3`, `C3/C$3`.
- **Column baseline: same row fixed** — examples: `B3/B$3`, `B4/B$4`, `C3/C$3`.
- **Row baseline: first data column** — examples: `B3/$B3`, `C3/$B3`.
- **Global baseline: first numeric cell** — examples: `B3/$B$3`, `C3/$B$3`.
- **Cycle baseline: first row of each cycle, same column** — each cycle is normalized to its own first row.

You can set:

- Cycle count
- Header rows
- Label columns
- Rows per cycle, or let the app calculate rows per cycle automatically from cycle count
- Output mode: formulas with labels, calculated values with labels, formula cells only, or denominator references only

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

## Install locally

```bash
cd /path/to/your/repo/photoswitch-web-app
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

## Example Excel input

Paste this directly into the app input box:

```text
Frame	ROI1	ROI2	ROI3	ROI4	ROI5
1	12000	13000	12800	11000	11800
2	11500	12500	12100	10400	11100
3	10800	11900	11600	9900	10500
4	10100	11200	11000	9400	9900
```

For this example, use:

```text
Header rows: 1
Label columns: 1
```

The first numeric cell is therefore `B2`. If your pasted block has two header rows, set `Header rows: 2`, and the first numeric cell will be `B3`.

## Export/copy output

After normalization, choose an output layout:

- **Excel formulas with original labels**: best when you want editable formulas in Excel.
- **Calculated normalized values with original labels**: best when you want numeric results only.
- **Only formula cells**: best when you want to paste formulas into an existing sheet region.
- **Only denominator references**: useful for checking which baseline cell each output cell uses.

Click **Copy output for Excel**, then paste into Excel. Or click **Download XLSX** to get an Excel workbook with separate sheets for normalized values, formulas, and denominator references.

## Project structure

```text
photoswitch-web-app/
  package.json
  index.html
  vite.config.js
  src/
    main.jsx
    App.jsx
    utils/
      excelNormalization.js
      parser.js
      analysis.js
      cycleUtils.js
      exportUtils.js
      storageUtils.js
    components/
      DataInput.jsx
      SettingsPanel.jsx
      DataPreview.jsx
      ResultsTable.jsx
      ChartPanel.jsx
      SavedExperiments.jsx
    styles/
      App.css
```
