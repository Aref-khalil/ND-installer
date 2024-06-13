const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const { spawn } = require("child_process");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true, // like her
      sandbox: false,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, "index.html"));

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  ipcMain.on("NexusDriveLetter", (event, value) => {
    console.log("on NexusDriveLetter", value);
    global.Mapped_Drive = value;
    process.env.Mapped_Drive = value;
  });
};

const unMapDrive = async () => {
  const drive = process.env.Mapped_Drive;
  console.log("Unmapping nexus drive...", drive);
  return new Promise((resolve, reject) => {
    console.log("Unmapping nexus drive...", drive);
    const worker = spawn("net", ["use", `${drive}`, "/delete"]);

    worker.stdout.on("data", (data) => {
      console.log("on data", data.toString());
    });

    worker.stderr.on("data", (data) => {
      console.error("on error", data.toString());
    });

    worker.on("exit", (code) => {
      if (code !== 0) {
        console.error(`unMapDrive script failed with code ${code}`);
        reject(new Error("Error unmapping nexus drive"));
      } else resolve(true);
      console.log(`unMapDrive script completed ${code}`);
    });
  });
};
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // ipcMain.handle("unMapDrive", (event, arg) => {
  //   // Do some processing in the main process
  //   const result = "This is the result from the main process";
  //   return result;
  // });
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    console.log("Closing app and unmapping nexus drive...");
    unMapDrive()
      .then((unmapped) => {
        if (unmapped) {
          console.log("Nexus drive unmapped successfully");
          app.quit();
        }
      })
      .catch((error) => {
        console.error(error);
      });
  }
});
