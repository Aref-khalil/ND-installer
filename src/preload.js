// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

// Preload Script
const { ipcRenderer } = require("electron");

const config = require("./resources/envConfig.json");
const { spawn, exec } = require("child_process");

const request = require("request");
const { rename } = require("fs");

async function verifyServer() {
  serverUrl = config.envUrl;
  try {
    return await new Promise((resolve, reject) => {
      request(serverUrl, { method: "PROPFIND" }, (error, response) => {
        if (error) {
          reject(false);
        } else {
          if (response.statusCode === 207) {
            console.log("WebDAV server is running.");
          } else {
            console.error("Unexpected status code:", response.statusCode);
            reject(false);
          }
          resolve(true);
        }
      });
    });
  } catch (error) {
    console.error(
      "Server is not running , Error verifying WebDAV server:",
      error
    );
  }
}

// Replace with your actual port
const verifyServer2 = (port) => {
  // skipping for now
  // return new Promise((resolve, reject) => {
  //   resolve(true);
  // });
  //Run the command
  const childProcess = spawn("netstat", ["-ano"]);
  if (!port) return true; // If port is not provided, return skip the check , we need to ping the prod server instead
  return new Promise((resolve, reject) => {
    // Log the output
    let output = "";
    childProcess.stdout.on("data", (data) => {
      output = data.toString();
      // console.log(`Output: ${output}`, output.includes(`${port}`));
    });
    childProcess.stderr.on("data", (error) => {
      console.error(`Error: ${error}`);
    });
    childProcess.on("close", (code) => {
      // console.log("on close output", output);
      if (code !== 0) {
        console.error(`Child process exited with code ${code}`);
        reject(false);
      } else if (output.includes(`:${port}`)) {
        console.log(`Server is running on port ${port}`);
        resolve(true);
      } else {
        reject(false);
      }
    });
  });
};
// Replace with your actual network path
const nexusServerUrl = config.envUrl;
const localNetworkPath = config.localNetworkPath;
const port = nexusServerUrl.split(":")[2].split("/")[0];
console.log("localNetworkPath", localNetworkPath);
console.log("nexusServerUrl", nexusServerUrl);
console.log("port", port);

// Get all currently mapped drive letters
const getMappedDriveLetters = () => {
  return new Promise((resolve, reject) => {
    const result = spawn("net", ["use"], { shell: true, windowsHide: true });
    let output = "";

    result.stdout.on("data", (data) => {
      output += data.toString();
    });

    result.on("close", (code) => {
      if (code === 0) {
        const driveLetters = output.match(/[A-Z]:/g);
        console.log("getMappedDriveLetters", driveLetters);
        resolve(driveLetters);
      } else {
        reject(new Error("Error retrieving mapped drive letters."));
      }
    });
  });
};

// Check if the network path is already mapped
const isNexusDriveAlreadyMapped = () => {
  return new Promise((resolve, reject) => {
    const result = spawn("net", ["use"], {
      shell: true,
      windowsHide: true,
    });

    result.stdout.on("data", (data) => {
      console.log("isNexusDriveAlreadyMapped data", data.toString());
      if (data.includes(localNetworkPath)) {
        const driveLetter = data.toString().match(/[A-Z]:/g)[0];
        ipcRenderer.send("NexusDriveLetter", driveLetter);
        console.log("send availableDriveLetter", driveLetter);
        console.log(
          `${driveLetter} Network drive is already mapped to ${localNetworkPath}`
        );
        resolve(true); // Drive is already mapped
      }
    });

    result.on("close", (code) => {
      if (code !== 0) {
        reject(new Error("Error checking mapped drives."));
      } else {
        resolve(false); // Drive is not mapped
      }
    });
  });
};

// Find an available drive letter
const findAvailableDriveLetter = (driveLetters) => {
  const allDriveLetters = new Set("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  console.log("driveLetters", driveLetters);
  const mappedDriveLetters = new Set();
  driveLetters?.forEach((letter) => {
    mappedDriveLetters.add(`${letter}:`);
  });
  console.log("mappedDriveLetters", mappedDriveLetters);
  const availableDriveLetters = [...allDriveLetters].filter(
    (letter) => !mappedDriveLetters.has(letter)
  );

  console.log("availableDriveLetters", availableDriveLetters);
  return availableDriveLetters[0] || null;
};

// Map the network drive
const mapDrive = (driveLetters) => {
  const availableDriveLetter = findAvailableDriveLetter(driveLetters);
  if (availableDriveLetter) {
    const result = spawn(
      "net",
      ["use", `${availableDriveLetter}:`, nexusServerUrl],
      {
        shell: true,
        windowsHide: true,
      }
    );

    result.stderr.on("data", (data) => {
      console.error("stderr:", data.toString());
    });

    result.on("close", (code) => {
      if (code === 0) {
        ipcRenderer.send("NexusDriveLetter", availableDriveLetter);
        console.log("send NexusDriveLetter", availableDriveLetter);
        console.log(
          `Mapped network drive ${availableDriveLetter} to ${nexusServerUrl}`
        );
      } else {
        console.error(`Failed to map network drive ${availableDriveLetter}`);
      }
    });
  } else {
    console.error("No available drive letters to map.");
  }
};

renameDrive = () => {
  // rename the drive After mapping
  const driveLabel = "Nexus Drive";
  // replace \ with #
  const key = localNetworkPath.replace(/\\/g, "#");
  console.log("key", key);
  exec(
    `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\MountPoints2\\#${key}" /f /v "_LabelFromReg" /t REG_SZ /d "${driveLabel}"`,
    (error, stdout, stderr) => {
      if (error || stderr) {
        console.error("Error renaming network drive:", error.message);
      } else {
        console.log("Network drive renamed successfully:", stdout);
      }
    }
  );
};

verifyServer().then((isRunning) => {
  // Start by checking existing mappings
  // verifyServer(port)
  //   .then((isRunning) => {
  //     if (isRunning) {
  if (isRunning) {
    getMappedDriveLetters()
      .then((driveLetters) => {
        isNexusDriveAlreadyMapped()
          .then((isMapped) => {
            console.log("isMapped", isMapped);
            if (!isMapped) {
              mapDrive(driveLetters);
              renameDrive();
            } else {
              console.log("Nexus drive is already mapped");
            }
          })
          .catch((error) => {
            console.error("error in isNexusDriveAlreadyMapped:", error.message);
          });
      })
      .catch((error) => {
        console.error("failed to verify nexus mapped drive:", error.message);
      });
  }
});
//}
// })
// .catch((error) => {
//   console.error("Server is not running on port 8401", error);
// });

// const config =
//   process.env.NODE_ENV != "development"
//     ? "{{PRODUCTION_ENV_URL}}"
//     : require("./resources/envConfig.json");

// console.log("config", config);
// const url =
//   process.env.NODE_ENV != "development"
//     ? config.envUrl
//     : "http://localhost:8401/";

// console.log("url", url);

// const mapDrive = async () => {
//   console.log("Starting setup...");
//   console.log("Mapping nexus drive", url);
//   const bat = spawn(".\\resources\\setup.bat", [url]);

//   console.log("bat", bat);

//   console.log("Running setup.bat");
//   bat.stdout.on("data", (data) => {
//     console.log("on data", data.toString());
//     if (data.toString().includes("Mapped:"))
//       process.env.Mapped_Drive = data.toString().split("Mapped:")[1].trim();
//     console.log("process.env.Mapped_Drive", process.env.Mapped_Drive);
//   });

//   bat.stderr.on("data", (data) => {
//     // Handle errors or show notifications
//     console.error("on error", data.toString());
//   });

//   bat.on("exit", (code) => {
//     console.log(`script completed ${code}`);
//   });
// };

// // console.log("preload.js loaded");
// // contextBridge.exposeInMainWorld("versions", {
// //   node: () => process.versions.node,
// //   chrome: () => process.versions.chrome,
// //   electron: () => process.versions.electron,

// //   // You can also expose variables, not just functions
// // });

// mapDrive() ;
