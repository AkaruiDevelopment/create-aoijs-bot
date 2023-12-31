#! /usr/bin/env node

import inquirer from "inquirer";
import fs from "fs";
import * as installer from "../../src/helpers/cmd.js";
import path from "path";
import chalk from "chalk";
import crypto from "crypto";
import { fileURLToPath } from "url";
import os from "os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const key = crypto.randomBytes(16).toString("hex");

async function promptUser() {
  const questions = [
    {
      type: "input",
      name: "directory",
      message: `Project Directory: `,
      default: "./",
      suffix: `${chalk.gray("(Press Enter to Skip)")} `,
      prefix: `\n\r${chalk.blueBright("> ")}`,
    },
    {
      type: "input",
      name: "token",
      message: "Discord Bot Token: ",
      default: "",
      suffix: `${chalk.gray("(Press Enter to Skip)")} `,
      prefix: `\n\r${chalk.blueBright("> ")}`,
    },
    {
      type: "input",
      name: "prefix",
      message: "Discord Bot Prefix: ",
      default: "!",
      suffix: `${chalk.gray("(Press Enter to Skip)")}`,
      prefix: `\n\r${chalk.blueBright("> ")}`,
    },
    {
      type: "list",
      name: "setup",
      message: "Template you want to use: ",
      choices: ["Starter", "Advanced", "Sharding"],
      default: "Starter",
      suffix: `${chalk.gray("(Press Enter to Skip)")}`,
      prefix: `\n\r${chalk.blueBright("> ")}`,
    },
    {
      type: "confirm",
      name: "install-deps",
      message: "Do you want to install all needed packages: ",
      default: "Yes",
      suffix: `${chalk.gray("(Press Enter to Skip)")}`,
      prefix: `\n\r${chalk.blueBright("> ")}`,
    },
    {
      type: "confirm",
      name: "install-aoimusic",
      message: "Do you want to implement music in your bot: ",
      default: "Yes",
      suffix: `${chalk.gray("(Press Enter to Skip)")}`,
      prefix: `\n\r${chalk.blueBright("> ")}`,
    },
  ];

  if (os.platform() === "linux") {
    questions.splice(1, 0, {
      type: "confirm",
      name: "isreplit",
      message: "Are you using replit?:",
      default: "No",
      prefix: `\n\r${chalk.blueBright("> ")}`,
    });
  }

  return await inquirer.prompt(questions);
}

async function modifyIndex(answers, directoryPath) {
  const {
    prefix,
    token,
    setup,
    "install-aoimusic": useMusic,
    isreplit,
  } = answers;

  let mainFileContent = fs
    .readFileSync(path.join(__dirname, "../template/index.template.js"), "utf8")
    .replace(/{TOKEN}/g, isreplit === "Yes" ? "" : token)
    .replace(/{PREFIX}/g, isreplit === "Yes" ? "" : prefix)
    .replace(/{KEY}/g, key);

  let shardingFileContent = fs
    .readFileSync(
      path.join(__dirname, "../template/sharding.template.js"),
      "utf8"
    )
    .replace(/{TOKEN}/g, isreplit === "Yes" ? "" : token)
    .replace(/{PREFIX}/g, isreplit === "Yes" ? "" : prefix)
    .replace(/{KEY}/g, key);

  let handlerFileContent = fs
    .readFileSync(
      path.join(__dirname, "../template/handler.template.js"),
      "utf8"
    )
    .replace(/{TOKEN}/g, isreplit === "Yes" ? "" : token)
    .replace(/{PREFIX}/g, isreplit === "Yes" ? "" : prefix)
    .replace(/{KEY}/g, key);

  let handlerExampleContent = fs.readFileSync(
    path.join(__dirname, "../template/handler-example.template.js"),
    "utf8"
  );

  let aoimusicsetup = fs
    .readFileSync(
      path.join(__dirname, "../template/aoi-music.template.js"),
      "utf8"
    )
    .split("//---");

  fs.writeFileSync(
    path.join(directoryPath, "index.js"),
    setup === "Advanced" ? handlerFileContent : mainFileContent
  );

  if (
    setup === "Advanced" &&
    !fs.existsSync(path.join(directoryPath, "commands"))
  ) {
    fs.mkdirSync(path.join(directoryPath, "commands"), { recursive: true });
    fs.writeFileSync(
      path.join(directoryPath, "commands", "ping.js"),
      handlerExampleContent
    );
  }

  if (useMusic) {
    const [aoiMusicSetupStart, ...aoiMusicSetupEnd] = aoimusicsetup;
    fs.writeFileSync(
      path.join(directoryPath, "index.js"),
      `${aoiMusicSetupStart}\n${fs.readFileSync(
        path.join(directoryPath, "index.js"),
        "utf8"
      )}`
    );
    fs.appendFileSync(
      path.join(directoryPath, "index.js"),
      `\n${aoiMusicSetupEnd.join("\n\n")}`
    );
  }

  if (answers.setup === "Sharding") {
    fs.writeFileSync(
      path.join(directoryPath, "sharding.js"),
      shardingFileContent
    );
  }
}

async function installPackage(answers) {
  await installer.execute("npm init -y");

  if (answers["install-deps"]) {
    console.log(`\n\r${chalk.black.bgYellow(" install ")} Installing now all needed packages...`);
    await installer.install("aoi.js");
  }

  if (answers["install-aoimusic"]) {
    await installer.install("@akarui/aoi.music");
    console.log(`\n\r${chalk.black.bgYellow(" deps ")} Installing now all needed dependencies for aoi.music...`);
    await installer.install("opusscript", "Installing opusscript");
    await installer.install("ffmpeg-static", "Installing ffmpeg-static");
  }
}

try {
  const { directory, ...answers } = await promptUser();

  const directoryPath = path.resolve(directory);

  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }

  process.chdir(directoryPath);
  modifyIndex(answers, directoryPath);
  await installPackage(answers);

  fs.writeFileSync(
    path.join(directoryPath, "package.json"),
    JSON.stringify(
      {
        ...JSON.parse(
          fs.readFileSync(path.join(directoryPath, "package.json"), "utf-8")
        ),
        main: answers.setup === "Sharding" ? "./sharding.js" : "./index.js",
      },
      null,
      2
    )
  );

  if (answers.isreplit) {
    console.log(
      `\n\r${chalk.black.bgYellow(
        " warn "
      )} You are using replit, so you need to add your token and prefix in a environment variable called ${chalk.gray(
        "token"
      )} and ${chalk.gray(
        "prefix"
      )}. \n\r Don't know what to do? Check out their documentation: ${chalk.underline(
        "https://docs.replit.com/programming-ide/workspace-features/secrets"
      )}`
    );
  }

  if (answers.token === "" && !answers.isreplit)
    console.log(
      `\n\r${chalk.black.bgYellow(
        " warn "
      )} You didn't provide a token, so you need to add your token in your ${
        answers.setup === "Sharding"
          ? `${chalk.gray("index.js")} & ${chalk.gray("sharding.js")}`
          : `${chalk.gray("index.js")}`
      } file.`
    );

  console.log(
    `\n\rYou can now start your bot using the command ${chalk.gray(
      "`node .`"
    )}\n\rIf you have any issues feel free to join our Discord (${chalk.underline(
      "https://aoi.js.org/invite"
    )}) or check our documentation (${chalk.underline("https://aoi.js.org/")}).`
  );
} catch (error) {
  console.error("Something went wrong, failed to handle:", error);
}
