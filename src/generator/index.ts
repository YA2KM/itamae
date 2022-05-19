import * as ts from "typescript";
import {Expression, PropertyAssignment, Statement, TypeNode} from "typescript";

const factory = ts.factory

const printer = ts.createPrinter({newLine: ts.NewLineKind.LineFeed});
const source = ts.createSourceFile('server/index.ts', '', ts.ScriptTarget.Latest)
type SchemaType = 'array' | 'boolean' | 'file' | 'integer' | 'number' | 'string' | 'object'

export type SchemaProperty = {
  type: Exclude<SchemaType, 'object'>
} | {
  type: 'object'
  properties: Properties
}

export type Properties = {
  [key: string]: SchemaProperty
}

export interface Parameters {
  name: string,
  in: string,
  schema: SchemaProperty
}

export interface ResponseSchemaProperty {
  type: string
}

export interface Response {
  description: string,
  content: {
    [key: string]: {
      schema: {
        type: 'object',
        properties: {
          [key: string]: ResponseSchemaProperty
        }
      }
    }
  }
}

export interface Endpoint {
  method: string,
  path: string,
  summary: string,
  responses: {
    200: Response
  }
  parameters: Parameters[],
  requestBody?: SchemaProperty
}

export function processParametersAndRequestBody(parameters: Parameters[] | undefined, endpoint: Endpoint, property: SchemaProperty | undefined): Statement[] {
  if (parameters === void 0) {
    // if endpoint does not accept any parameters
    parameters = []
  }
  return [
    ...createZodSchemaAndType({
      parameters: parameters.filter(param => param.in === "query"),
      endpoint: endpoint,
      type: 'Query'
    }),
    ...createZodSchemaAndType({
      property: property,
      endpoint: endpoint,
      type: 'Body'
    })
  ]
}


export function createExportClassStatement(endpoints: Endpoint[]) {
  return factory.createVariableStatement(
    [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    factory.createVariableDeclarationList(
      [factory.createVariableDeclaration(
        factory.createIdentifier("endpoints"),
        undefined,
        undefined,
        factory.createObjectLiteralExpression(
          endpoints.map(endpoint => {
            return (factory.createPropertyAssignment(
              factory.createIdentifier(endpoint.summary),
              factory.createNewExpression(
                factory.createIdentifier(endpoint.summary),
                undefined,
                []
              )
            ))
          }),
          true
        )
      )],
      ts.NodeFlags.Const
    )
  );
}

export function createImportStatement() {
  return [factory.createImportDeclaration(
    undefined,
    undefined,
    factory.createImportClause(
      false,
      undefined,
      factory.createNamedImports([
        factory.createImportSpecifier(
          false,
          undefined,
          factory.createIdentifier("method")
        ),
        factory.createImportSpecifier(
          false,
          undefined,
          factory.createIdentifier("__handle")
        )
      ])
    ),
    factory.createStringLiteral("./index"),
    undefined
  ),
    factory.createImportDeclaration(
      undefined,
      undefined,
      factory.createImportClause(
        false,
        undefined,
        factory.createNamedImports([factory.createImportSpecifier(
          false,
          undefined,
          factory.createIdentifier("z")
        )])
      ),
      factory.createStringLiteral("zod"),
      undefined
    )
  ]
}

export function convertASTtoCode(astList: ts.Node[]): string[] {
  return astList.map(ast => {
    return printer.printNode(ts.EmitHint.Unspecified, ast, source)
  })
}

export function createResType(endpoint: Endpoint) {
  return factory.createTypeAliasDeclaration(
    undefined,
    undefined,
    factory.createIdentifier(`${endpoint.summary}Res`),
    undefined,
    factory.createTypeLiteralNode(
      Object.keys(endpoint.responses["200"].content['*/*'].schema.properties).map(key => {
        const property = endpoint.responses["200"].content['*/*'].schema.properties[key]
        return convertResPropertyToAstTypeNode(property, key)
      }))
  );
}

export function createClass(endpoint: Endpoint) {
  return factory.createClassDeclaration(
    undefined,
    [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    factory.createIdentifier(endpoint.summary),
    undefined,
    undefined,
    [
      factory.createPropertyDeclaration(
        undefined,
        undefined,
        factory.createIdentifier("path"),
        undefined,
        factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
        undefined
      ),
      factory.createPropertyDeclaration(
        undefined,
        undefined,
        factory.createIdentifier("method"),
        undefined,
        factory.createTypeReferenceNode(
          factory.createIdentifier("method"),
          undefined
        ),
        undefined
      ), factory.createPropertyDeclaration(
      undefined,
      undefined,
      factory.createIdentifier("parseRequiredQueryKeyList"),
      undefined,
      factory.createArrayTypeNode(factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)),
      undefined
    ),
      factory.createConstructorDeclaration(
        undefined,
        undefined,
        [],
        factory.createBlock(
          [
            factory.createExpressionStatement(factory.createBinaryExpression(
              factory.createPropertyAccessExpression(
                factory.createThis(),
                factory.createIdentifier("path")
              ),
              factory.createToken(ts.SyntaxKind.EqualsToken),
              factory.createStringLiteral(endpoint.path)
            )),
            factory.createExpressionStatement(factory.createBinaryExpression(
              factory.createPropertyAccessExpression(
                factory.createThis(),
                factory.createIdentifier("method")
              ),
              factory.createToken(ts.SyntaxKind.EqualsToken),
              factory.createStringLiteral(endpoint.method)
            )),
            factory.createExpressionStatement(factory.createBinaryExpression(
              factory.createPropertyAccessExpression(
                factory.createThis(),
                factory.createIdentifier("parseRequiredQueryKeyList")
              ),
              factory.createToken(ts.SyntaxKind.EqualsToken),
              factory.createArrayLiteralExpression(
                endpoint.parameters
                  .filter(param => param.schema.type === 'object')
                  .map(param => factory.createStringLiteral(param.name)),
                false
              )
            ))
          ],
          true
        )
      ),
      factory.createMethodDeclaration(
        undefined,
        undefined,
        undefined,
        factory.createIdentifier("handle"),
        undefined,
        undefined,
        [
          factory.createParameterDeclaration(
            undefined,
            undefined,
            undefined,
            factory.createIdentifier("cb"),
            undefined,
            factory.createFunctionTypeNode(
              undefined,
              [
                factory.createParameterDeclaration(
                  undefined,
                  undefined,
                  undefined,
                  factory.createIdentifier("body"),
                  undefined,
                  factory.createTypeReferenceNode(
                    factory.createIdentifier(`${endpoint.summary}Body`),
                    undefined
                  ),
                  undefined
                ),
                factory.createParameterDeclaration(
                  undefined,
                  undefined,
                  undefined,
                  factory.createIdentifier("query"),
                  undefined,
                  factory.createTypeReferenceNode(
                    factory.createIdentifier(`${endpoint.summary}Query`),
                    undefined
                  ),
                  undefined
                )
              ],
              factory.createTypeReferenceNode(
                factory.createIdentifier("Promise"),
                [factory.createTypeReferenceNode(
                  factory.createIdentifier(`${endpoint.summary}Res`),
                  undefined
                )]
              )
            ),
            undefined
          ),
          factory.createParameterDeclaration(
            undefined,
            undefined,
            undefined,
            factory.createIdentifier("onValidationFailure"),
            undefined,
            factory.createUnionTypeNode([
              factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
              factory.createParenthesizedType(factory.createFunctionTypeNode(
                undefined,
                [factory.createParameterDeclaration(
                  undefined,
                  undefined,
                  undefined,
                  factory.createIdentifier("res"),
                  undefined,
                  factory.createTypeReferenceNode(
                    factory.createQualifiedName(
                      factory.createIdentifier("Express"),
                      factory.createIdentifier("Response")
                    ),
                    undefined
                  ),
                  undefined
                )],
                factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword)
              ))
            ])
          )
        ],
        undefined,
        factory.createBlock(
          [factory.createExpressionStatement(factory.createCallExpression(
            factory.createIdentifier("__handle"),
            [
              factory.createTypeReferenceNode(
                factory.createIdentifier(`${endpoint.summary}Body`),
                undefined
              ),
              factory.createTypeReferenceNode(
                factory.createIdentifier(`${endpoint.summary}Query`),
                undefined
              ),
              factory.createTypeReferenceNode(
                factory.createIdentifier(`${endpoint.summary}Res`),
                undefined
              )
            ],
            [
              factory.createObjectLiteralExpression(
                [
                  factory.createPropertyAssignment(
                    factory.createIdentifier("path"),
                    factory.createPropertyAccessExpression(
                      factory.createThis(),
                      factory.createIdentifier("path")
                    )
                  ),
                  factory.createPropertyAssignment(
                    factory.createIdentifier("method"),
                    factory.createPropertyAccessExpression(
                      factory.createThis(),
                      factory.createIdentifier("method")
                    )
                  ),
                  factory.createPropertyAssignment(
                    factory.createIdentifier("handleMethod"),
                    factory.createArrowFunction(
                      [factory.createModifier(ts.SyntaxKind.AsyncKeyword)],
                      undefined,
                      [
                        factory.createParameterDeclaration(
                          undefined,
                          undefined,
                          undefined,
                          factory.createIdentifier("body"),
                          undefined,
                          undefined,
                          undefined
                        ),
                        factory.createParameterDeclaration(
                          undefined,
                          undefined,
                          undefined,
                          factory.createIdentifier("query"),
                          undefined,
                          undefined,
                          undefined
                        ),
                      ],
                      undefined,
                      factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                      factory.createBlock(
                        [factory.createReturnStatement(factory.createCallExpression(
                          factory.createIdentifier("cb"),
                          undefined,
                          [
                            factory.createIdentifier("body"),
                            factory.createIdentifier("query"),
                          ]
                        ))],
                        true
                      )
                    ),
                  ),
                  factory.createPropertyAssignment(
                    factory.createIdentifier("zodBodySchema"),
                    factory.createIdentifier(`${endpoint.summary}BodySchema`)
                  ),
                  factory.createPropertyAssignment(
                    factory.createIdentifier("zodQuerySchema"),
                    factory.createIdentifier(`${endpoint.summary}QuerySchema`)
                  ),
                  factory.createPropertyAssignment(
                    factory.createIdentifier("onValidationFailure"),
                    factory.createIdentifier("onValidationFailure")
                  ),
                  factory.createPropertyAssignment(
                    factory.createIdentifier("parseRequiredQueryKeyList"),
                    factory.createPropertyAccessExpression(
                      factory.createThis(),
                      factory.createIdentifier("parseRequiredQueryKeyList")
                    )
                  )
                ],
                true
              )
            ]
          ))],
          true
        )
      )
    ]
  )
    ;
}

type PropsOfCreateZodSchemaAndType = {
  parameters: Parameters[],
  endpoint: Endpoint,
  type: "Query"
} | {
  endpoint: Endpoint
  property?: SchemaProperty
  type: "Body"
}

export function propsToZodElement(props: PropsOfCreateZodSchemaAndType) {
  if (props.type === 'Query') {
    const {parameters, endpoint, type} = props

    function getMembers() {
      return parameters.map(param => {
        return factory.createPropertyAssignment(
          factory.createIdentifier(param.name),
          convertSchemaToZodSchemaElement(param.schema),
        )
      })
    }

    function getObject() {
      return factory.createCallExpression(
        factory.createPropertyAccessExpression(
          factory.createIdentifier("z"),
          factory.createIdentifier("object")
        ),
        undefined,
        [factory.createObjectLiteralExpression(
          getMembers(),
          true
        )]
      )
    }

    return factory.createVariableStatement(
      undefined,
      factory.createVariableDeclarationList(
        [factory.createVariableDeclaration(
          factory.createIdentifier(`${endpoint.summary}${type}Schema`),
          undefined,
          undefined,
          getObject()
        )],
        ts.NodeFlags.Const
      )
    )
  } else {
    const {property, endpoint, type} = props
    function getInitializer() {
      if (property === void 0) {
        return factory.createCallExpression(
          factory.createPropertyAccessExpression(
            factory.createIdentifier("z"),
            factory.createIdentifier("object")
          ),
          undefined,
          [factory.createObjectLiteralExpression()]
        )
      }
      return convertSchemaToZodSchemaElement(property)
    }

    return factory.createVariableStatement(
      undefined,
      factory.createVariableDeclarationList(
        [factory.createVariableDeclaration(
          factory.createIdentifier(`${endpoint.summary}${type}Schema`),
          undefined,
          undefined,
          getInitializer()
        )],
        ts.NodeFlags.Const
      )
    )

  }

}

export function createZodSchemaAndType(props: PropsOfCreateZodSchemaAndType) {
  return [
    propsToZodElement(props),
    factory.createTypeAliasDeclaration(
      undefined,
      undefined,
      factory.createIdentifier(`${props.endpoint.summary}${props.type}`),
      undefined,
      factory.createTypeReferenceNode(
        factory.createQualifiedName(
          factory.createIdentifier("z"),
          factory.createIdentifier("infer")
        ),
        [factory.createTypeQueryNode(factory.createIdentifier(`${props.endpoint.summary}${props.type}Schema`))]
      )
    )
  ]

}

export function convertResPropertyToAstTypeNode(property: ResponseSchemaProperty, key: string) {
  if (property.type === 'string') {
    return factory.createPropertySignature(
      undefined,
      factory.createIdentifier(key),
      undefined,
      factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
    )
  }
  throw 'ERROR'
}

export function convertPropertiesToZodElement(properties: Properties) {

  function getElement(property: SchemaProperty, name: string): PropertyAssignment {
    switch (property.type) {
      case 'object':
        return factory.createPropertyAssignment(
          factory.createIdentifier(name),
          factory.createCallExpression(
            factory.createPropertyAccessExpression(
              factory.createIdentifier("z"),
              factory.createIdentifier("object")
            ),
            undefined,
            [factory.createObjectLiteralExpression(
              Object.keys(property.properties).map(name => {
                const p = property.properties[name]
                return getElement(p, name)
              }),
              true
            )]
          )
        )
      default:
        return factory.createPropertyAssignment(
          factory.createIdentifier(name),
          factory.createCallExpression(
            factory.createPropertyAccessExpression(
              factory.createIdentifier("z"),
              factory.createIdentifier(property.type)
            ),
            undefined,
            []
          )
        )
    }
  }

  return Object.keys(properties).map(name => {
    const property = properties[name]
    return getElement(property, name)
  })


}

export function convertSchemaToZodSchemaElement(schema: SchemaProperty) {
  switch (schema.type) {
    case 'object':
      const elements = convertPropertiesToZodElement(schema.properties)
      return factory.createCallExpression(
        factory.createPropertyAccessExpression(
          factory.createIdentifier("z"),
          factory.createIdentifier("object")
        ),
        undefined,
        [factory.createObjectLiteralExpression(
          elements,
          true
        )]
      )
    default:
      return factory.createCallExpression(
        factory.createPropertyAccessExpression(
          factory.createIdentifier("z"),
          factory.createIdentifier(schema.type)
        ),
        undefined,
        []
      )
  }

}

