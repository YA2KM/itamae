import fs from "fs";
import * as ts from "typescript";
import path from "path";

function readConfigFile(configFileName: string) {
  const configFileText = fs.readFileSync(configFileName).toString();
  const result = ts.parseConfigFileTextToJson(configFileName, configFileText);
  const configObject = result.config;
  if (!configObject) {
    process.exit(1);
  }
  const configParseResult = ts.parseJsonConfigFileContent(configObject, ts.sys, path.dirname(configFileName));
  if (configParseResult.errors.length > 0) {
    process.exit(1);
  }
  return configParseResult;
}

export function compile(configFileName: string): void {
  let config = readConfigFile(configFileName);
  let program = ts.createProgram(config.fileNames, config.options);
  let emitResult = program.emit();
}
