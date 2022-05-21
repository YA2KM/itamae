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
  pathName: string,
  operationId: string,
  responses: {
    200: Response
  }
  parameters: Parameters[],
  requestBody?: SchemaProperty
}

function createHandlePropsType({endpoint}: {endpoint: Endpoint}) {
  return [
    factory.createTypeAliasDeclaration(
    undefined,
    undefined,
    factory.createIdentifier(`${endpoint.pathName}HandleQueryType`),
    undefined,
    factory.createTypeLiteralNode(
      [
        factory.createPropertySignature(
          undefined,
          factory.createIdentifier("body"),
          undefined,
          factory.createTypeReferenceNode(
            factory.createIdentifier(`${endpoint.pathName}Body`),
            undefined
          )
        ),
        factory.createPropertySignature(
          undefined,
          factory.createIdentifier("query"),
          undefined,
          factory.createTypeReferenceNode(
            factory.createIdentifier(`${endpoint.pathName}Query`),
            undefined
          )
        )
      ]
    )
  )]
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
    }),
    ...createHandlePropsType({
      endpoint: endpoint
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
              factory.createIdentifier(endpoint.operationId),
              factory.createNewExpression(
                factory.createIdentifier(endpoint.pathName),
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
        ),
        factory.createImportSpecifier(
          false,
          undefined,
          factory.createIdentifier("SchemaType")
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
    factory.createIdentifier(`${endpoint.pathName}Res`),
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
    factory.createIdentifier(endpoint.pathName),
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
      factory.createIdentifier("parseRequiredQueryList"),
      undefined,
      factory.createArrayTypeNode(factory.createTypeLiteralNode([
        factory.createPropertySignature(
          undefined,
          factory.createIdentifier("key"),
          undefined,
          factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
        ),
        factory.createPropertySignature(
          undefined,
          factory.createIdentifier("type"),
          undefined,
          factory.createTypeReferenceNode(
            factory.createIdentifier("Exclude"),
            [
              factory.createTypeReferenceNode(
                factory.createIdentifier("SchemaType"),
                undefined
              ),
              factory.createLiteralTypeNode(factory.createStringLiteral("file"))
            ]
          )
        )
      ]))
      ,
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
                factory.createIdentifier("parseRequiredQueryList")
              ),
              factory.createToken(ts.SyntaxKind.EqualsToken),
              factory.createArrayLiteralExpression(
                [
                  ...endpoint.parameters
                  .filter(param => [
                    'array','boolean','integer','number','object'
                  ].includes(param.schema.type))
                  .map(param => factory.createObjectLiteralExpression(
                    [
                      factory.createPropertyAssignment(
                        factory.createIdentifier("key"),
                        factory.createStringLiteral(param.name)
                      ),
                      factory.createPropertyAssignment(
                        factory.createIdentifier("type"),
                        factory.createStringLiteral(param.schema.type)
                      )
                    ],
                    true
                  )),
                ],
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
        [factory.createParameterDeclaration(
          undefined,
          undefined,
          undefined,
          factory.createObjectBindingPattern([
            factory.createBindingElement(
              undefined,
              undefined,
              factory.createIdentifier("cb"),
              undefined
            ),
            factory.createBindingElement(
              undefined,
              undefined,
              factory.createIdentifier("onValidationFailure"),
              undefined
            )
          ]),
          undefined,
          factory.createTypeLiteralNode([
            factory.createPropertySignature(
              undefined,
              factory.createIdentifier("cb"),
              undefined,
              factory.createFunctionTypeNode(
                undefined,
                [factory.createParameterDeclaration(
                  undefined,
                  undefined,
                  undefined,
                  factory.createIdentifier("data"),
                  undefined,
                  factory.createTypeReferenceNode(
                    factory.createIdentifier(`${endpoint.pathName}HandleQueryType`),
                    undefined
                  ),
                  undefined
                )],
                factory.createTypeReferenceNode(
                  factory.createIdentifier("Promise"),
                  [factory.createTypeReferenceNode(
                    factory.createIdentifier(`${endpoint.pathName}Res`),
                    undefined
                  )]
                )
              )
            ),
            factory.createPropertySignature(
              undefined,
              factory.createIdentifier("onValidationFailure"),
              factory.createToken(ts.SyntaxKind.QuestionToken),
              factory.createFunctionTypeNode(
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
              )
            )
          ]),
          undefined
        )],
        undefined,
        factory.createBlock(
          [factory.createExpressionStatement(factory.createCallExpression(
            factory.createIdentifier("__handle"),
            [
              factory.createTypeReferenceNode(
                factory.createIdentifier(`${endpoint.pathName}Body`),
                undefined
              ),
              factory.createTypeReferenceNode(
                factory.createIdentifier(`${endpoint.pathName}Query`),
                undefined
              ),
              factory.createTypeReferenceNode(
                factory.createIdentifier(`${endpoint.pathName}Res`),
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
                        )
                      ],
                      undefined,
                      factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                      factory.createBlock(
                        [factory.createReturnStatement(factory.createCallExpression(
                          factory.createIdentifier("cb"),
                          undefined,
                          [factory.createObjectLiteralExpression(
                            [
                              factory.createShorthandPropertyAssignment(
                                factory.createIdentifier("body"),
                                undefined
                              ),
                              factory.createShorthandPropertyAssignment(
                                factory.createIdentifier("query"),
                                undefined
                              )
                            ],
                            false
                          )]
                        ))],
                        true
                      )
                    )
                  ),
                  factory.createPropertyAssignment(
                    factory.createIdentifier("zodBodySchema"),
                    factory.createIdentifier(`${endpoint.pathName}BodySchema`)
                  ),
                  factory.createPropertyAssignment(
                    factory.createIdentifier("zodQuerySchema"),
                    factory.createIdentifier(`${endpoint.pathName}QuerySchema`)
                  ),
                  factory.createPropertyAssignment(
                    factory.createIdentifier("onValidationFailure"),
                    factory.createIdentifier("onValidationFailure")
                  ),
                  factory.createPropertyAssignment(
                    factory.createIdentifier("parseRequiredQueryList"),
                    factory.createPropertyAccessExpression(
                      factory.createThis(),
                      factory.createIdentifier("parseRequiredQueryList")
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
          factory.createIdentifier(`${endpoint.pathName}${type}Schema`),
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
          factory.createIdentifier(`${endpoint.pathName}${type}Schema`),
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
      [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      factory.createIdentifier(`${props.endpoint.pathName}${props.type}`),
      undefined,
      factory.createTypeReferenceNode(
        factory.createQualifiedName(
          factory.createIdentifier("z"),
          factory.createIdentifier("infer")
        ),
        [factory.createTypeQueryNode(factory.createIdentifier(`${props.endpoint.pathName}${props.type}Schema`))]
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

