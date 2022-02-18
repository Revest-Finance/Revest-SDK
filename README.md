## Getting started

### 1. Install dependencies

- Run `npm install` to install the Revest SDK dependencies.

### 3. Build for development

- Having all the dependencies installed run `npm run dev`. This command will generate `UMD` (unminified), `CommonJS` and `ESM` modules under the `dist` folder. It will also watch for changes in source files to recompile.

### 4. Build for production

- Having all the dependencies installed run `npm run build`. This command will generate the same modules as above and one extra minified `UMD` bundle for usage in browser.

## Scripts

- `npm run build` - Produces production version of Revest modules under `dist` folder.
- `npm run dev` - Produces a development version of Revest and runs a watcher to watch for changes.
- `npm run lint` - Lints the source code with ESlint.
- `npm run prepare` - Run both BEFORE the package is packed and published, on local npm install without any arguments, and when installing git dependencies.
- `npm run clean` - Deletes `dist` and `coverage` folders.
- `npm run serve` - Activate local server

## Local Server
- Running `npm run serve` will start a local server where you can find the demo files, located at *http://127.0.0.1:8080/example/getAllFNFTsForUser.html* and *http://127.0.0.1:8080/example/getFNFTsForUserAndContract.html*



## Misc

- By default all source code is located under the `src` folder.
- Be default `dist` folder is excluded from source control but included for npm. You can change this behavior by not excluding this folder inside the `.gitignore` file.

