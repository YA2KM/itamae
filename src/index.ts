import * as ts from 'typescript'

const factory = ts.factory
import * as fs from "fs";
import fse, {mkdirp} from "fs-extra";
import path from 'path'
import $SwaggerParser from '@apidevtools/swagger-parser'
import * as generator from "./generator";
import {Endpoint, processParametersAndRequestBody, ResponseSchemaProperty} from "./generator";
import {Statement} from "typescript";
import {compile} from './compiler';


;(async () => {
  if (require.main === undefined) throw "Error"
  console.log("GENERATING CODE. please wait few minutes.")
  //Export Target Directory
  const targetDir = path.dirname(`./node_modules/sushi/void`)
  //cli-tool root Directory
  const root = require.main.path;

  const swagger = await $SwaggerParser.validate("./schema.yaml")
  const endpoints: Endpoint[] = []

  Object.keys(swagger.paths).map(pathString => {
    const path = swagger.paths[pathString]
    Object.keys(path).forEach(method => {
      const endpointData = path[method]
      const endpoint: Endpoint = {
        method,
        path: pathString,
        summary: endpointData.summary,
        responses: endpointData.responses,
        parameters: endpointData.parameters || [],
        requestBody: endpointData.requestBody?.content["*/*"]?.schema
      }
      endpoints.push(endpoint)
    })
  })

  const astList: Statement[] = [
      ...generator.createImportStatement(),
  ];

  endpoints.forEach(endpoint => {
    //generate Body type
    astList.push(...processParametersAndRequestBody(endpoint.parameters, endpoint, endpoint.requestBody))
    //generate Res type
    astList.push(generator.createResType(endpoint))
    //generate class
    astList.push(generator.createClass(endpoint))
  })

  //クラスたちのエクスポート
  astList.push(generator.createExportClassStatement(endpoints))

  const codes = generator.convertASTtoCode(astList)
  fs.writeFileSync(root + "/server/endpoints.ts", codes.join('\n'))

  await mkdirp(targetDir)

  //module compile
  compile(root + '/tsconfig.json')
  //tsconfig compile
  compile(root + '/tsconfig.esm.json')

  //copy package.json for generated module
  fs.copyFileSync(root + "/assets/package.json", root + "/sushi/server/package.json")
  //copy to target project node_modules
  fse.copySync(require.main.path + "/sushi", targetDir)
  console.log("DONE!\n")
})()

