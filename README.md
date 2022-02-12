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

## Misc

- By default all source code is located under the `src` folder.
- Be default `dist` folder is excluded from source control but included for npm. You can change this behavior by not excluding this folder inside the `.gitignore` file.

## Hardhat
- `cd into hardhat`
- `Run npm install`
- Create a .env file under /hardhat according to .envtemplate
- Use `npx hardhat run scripts/deploy-uniswap-test.js --network YOURNETWORKHERE` to deploy the contract
- Use `npx hardhat run scripts/verify-uniswap-test.js --network YOURNETWORKHERE` to verify the contract after pasting its address in

## Notes
The contract uses the JSON file found at uniswapTest.json to render its information on the frontend

Locking tokens in an FNFT through the endpoint present in UniswapDemo.sol `mintTimeLockToUniswap` will create an FNFT that sends the tokens inside of it to Uniswap upon withdrawal, swaps them for the tokens specified by the "path" variable during creation (sourced via normal Uniswap frontend methods), and sends the resulting output to the user making the withdrawal from the FNFT

Things not discussed in detail for this tech demo:

FNFTs need not contain actual assets: address(0) casting is perfectly acceptable, and "output receivers" will display their asset based on the "getAsset" call in their interface, rather than the actual asset stored in Revest's vaults
FNFTs can contain zero amounts of an actual asset (allowing for deposits of that asset later in time) and they can also contain non-zero amounts of a null asset (address(0)). This makes storing an "amount" variable in the default system more straightforward even when assets are being stored in other locations

## Contracts
This demo is currently deployed on Fantom Opera at `0x06ee1030AF860441bAeA4a2811843Ad312f9F766`

Public Revest Contracts are available at https://github.com/Revest-Finance/RevestContracts
