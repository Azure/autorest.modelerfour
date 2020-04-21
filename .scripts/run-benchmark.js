const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const specsRepoPath = process.argv[2];
const outputBasePath = process.argv[3];

const specsPath = path.join(specsRepoPath, "specification");

function getReadmesRecursively(folderPath) {
  let filesInPath = [];

  if (!fs.existsSync(folderPath)) {
    return [];
  }

  for (const childPath of fs.readdirSync(folderPath)) {
    const rootedPath = path.join(folderPath, childPath);
    if (fs.statSync(rootedPath).isDirectory()) {
      filesInPath = filesInPath.concat(getReadmesRecursively(rootedPath));
    } else if (path.basename(rootedPath).match(/README.md/i)) {
      filesInPath.push(rootedPath);
    }
  }

  return filesInPath;
}

function executeBenchmark(readmePath) {
  const relativePath = path.relative(path.dirname(specsRepoPath), readmePath);
  const outputPath = path.join("output", path.dirname(relativePath));

  fs.mkdirSync(outputPath, { recursive: true });

  const fileStream = fs.openSync(
    path.join(outputPath, "autorest-output.txt"),
    "w"
  );

  console.log(relativePath);

  let result = "succeeded";
  let resultColor = "\033[1;32m";
  const startTime = process.hrtime();
  try {
    const autoRestProcess = cp.execSync(
      `autorest --v3 \
                --debug \
                --use=./modelerfour \
                --modelerfour.deduplicate-schema-names:true \
                --inspector \
                --inspector.output-folder="./${outputPath}" \
                --output-folder="./${outputPath}" \
                "${readmePath}"`,
      { stdio: ["inherit", fileStream, fileStream] }
    );
  } catch (err) {
    result = "failed";
    resultColor = "\033[1;31m";
  }

  const elapsedTime = process.hrtime(startTime);
  const elapsedSeconds = (elapsedTime[0] + elapsedTime[1] / 1000000000).toFixed(
    3
  );
  console.log(`  └ ${resultColor}${result} in ${elapsedSeconds}`, "\033[0m\n");

  return {
    specPath: readmePath,
    outputPath,
    succeeded: result === "succeeded",
    time: parseFloat(elapsedSeconds)
  };
}

// Add some space for output
console.log("");

const readmePaths = getReadmesRecursively(specsPath);

const results = readmePaths
  .map(executeBenchmark)
  .sort((a, b) => b.time - a.time);

let aggregate = results.reduce(
  (totals, result) => {
    totals.success += result.succeeded === true ? 1 : 0;
    totals.time += result.time;
    return totals;
  },
  { time: 0.0, success: 0 }
);

const successPercentage = ((aggregate.success / results.length) * 100).toFixed(
  2
);

console.log(
  `${aggregate.success} out of ${
    results.length
  } succeeded (${successPercentage}%), ${aggregate.time.toFixed(
    3
  )}s total time\n`
);

const topCount = Math.min(5, results.length);
console.log(`Top ${topCount} longest runs:\n`);
results
  .slice(0, topCount)
  .forEach(r => console.log(`${r.time}s  ${r.specPath}`));

// Write out aggregate results file
const resultsFile = fs.writeFileSync(
  path.join(outputBasePath, "autorest-benchmark-results.csv"),
  results
    .map(r => `${r.specPath},${r.succeeded ? "succeeded" : "failed"},${r.time}`)
    .join("\n")
);
