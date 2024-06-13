const { MSICreator } = require("electron-wix-msi");
const path = require("path");

const appDirectory = path.join(__dirname, "./out");
const outputDirectory = path.join(__dirname, "./Nexus-Drive-win32-x64");

// Step 1: Instantiate the MSICreator
const msiCreator = new MSICreator({
  appDirectory,
  description: "Hexagon nexus Drive application",
  exe: "nexusDrive",
  name: "nexusDrive",
  manufacturer: "Hexagon",
  version: "1.0.0",
  outputDirectory,
  ui: {
    chooseDirectory: true,
  },
  icon: "./src/assets/icon.ico",
});

// // Step 2: Create a .wxs template file
// const supportBinaries = await msiCreator.create();

// // 🆕 Step 2a: optionally sign support binaries if you
// // sign you binaries as part of of your packaging script
// supportBinaries.forEach(async (binary) => {
//   // Binaries are the new stub executable and optionally
//   // the Squirrel auto updater.
//   await signFile(binary);
// });

// // Step 3: Compile the template to a .msi file
// await msiCreator.compile();

msiCreator.create().then(() => {
  msiCreator.compile();
});
