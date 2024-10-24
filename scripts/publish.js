const { execSync } = require("child_process");

const defaultBranch = "master";

const logInfo = (message) => console.log(`\x1b[34m${message}\x1b[0m`);    // Blue
const logSuccess = (message) => console.log(`\x1b[32m${message}\x1b[0m`);  // Green
const logError = (message) => console.error(`\x1b[31m${message}\x1b[0m`);  // Red

const getCurrentBranch = () => {
    logInfo("Getting current branch...");
    const branch = execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
    logSuccess(`Current branch: ${branch}`);
    return branch;
};

const isBranchUpToDate = () => {
    try {
        logInfo("Fetching latest changes from remote...");
        execSync("git fetch");
        logInfo("Checking if local branch is up to date with remote...");
        const localHash = execSync("git rev-parse HEAD").toString().trim();
        const remoteHash = execSync(`git rev-parse origin/${defaultBranch}`).toString().trim();
        return localHash === remoteHash;
    } catch (error) {
        logError(`Error checking if branch is up to date: ${error.message}`);
        return false;
    }
};

const updateBranchWithRemote = () => {
    logInfo(`Checking if ${defaultBranch} is up to date with changes...`);
    if (!isBranchUpToDate()) {
        logError("Error: Please sync and push changes first.");
        process.exit(1);
    }
    logSuccess("Branch is up to date with the remote repository.");
};

const publishNpmVersion = (type, mode) => {
    logInfo(`Starting script: deploying type: ${type}, deploying from: ${mode}...`);

    const currentBranch = getCurrentBranch();

    if (currentBranch !== defaultBranch) {
        logError(`Error: You should be in the "${defaultBranch}" branch to publish a version.`);
        process.exit(1);
    }

    try {
        if (!["patch", "minor", "major"].includes(type)) {
            throw new Error("Invalid type");
        }

        if (mode !== "github") {
            updateBranchWithRemote();
        } else {
            logInfo("Skipping remote changes check, as its running as github action...");
        }

        logInfo(`Updating npm version to ${type}...`);

        if (type === "major") {
            execSync("npm version major", { stdio: "inherit" });
        } else if (type === "minor") {
            execSync("npm version minor", { stdio: "inherit" });
        } else if (type === "patch") {
            execSync("npm version patch", { stdio: "inherit" });
        }

        logSuccess("Npm version updated.");

        logInfo("Pushing changes to remote...");
        execSync("git push", { stdio: "inherit" });
        execSync("git push --tags", { stdio: "inherit" });
        logSuccess("Changes pushed to github successfully.");

        logInfo("Publishing to npm...");
        execSync("npm publish", { stdio: "inherit" });
        logSuccess("Published to npm successfully.");

        const { version: deployedVersion, name: appName } = require("../package.json");
        logSuccess(`Deployed new version of ${appName}: ${deployedVersion}`);
    } catch (error) {
        logError(`Error publishing npm version: ${error.message}`);
        process.exit(1);
    }
};

const increamentToPublish = process.argv[2];
const modeOfDeployment = process.argv[3] || "local";

publishNpmVersion(increamentToPublish, modeOfDeployment);