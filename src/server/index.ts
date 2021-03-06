import express from "express";
import * as ep from "./endpoints";
import {z, ZodError} from 'zod'

const router = express.Router()

export function init () {
  return router
}
export type method = 'get' | 'post'
export type SchemaType = 'array' | 'boolean' | 'file' | 'integer' | 'number' | 'string' | 'object'

interface ResOrg {
  statusCode: "200" | "400" | "404" | "403" | "500",
}

interface ResJson extends ResOrg {
  "responseType": "application/json"
  "data": any
}
interface ResPlainText extends ResOrg{
  "responseType":"text/plain"
  "data": string
}

//Todo: Add support of other status code and response types.
export async function __handle<Body,Query,Res extends ResJson | ResPlainText>(param:{
  path: string,
  method: method,
  handleMethod: (body: Body,query: Query) => Promise<Res>,
  zodBodySchema: z.ZodSchema,
  zodQuerySchema: z.ZodSchema,
  onValidationFailure: undefined | ((res: Express.Response) => void),
  parseRequiredQueryList: {
    key: string,
    type: Exclude<SchemaType,'file'>
  }[]
}) {
  router[param.method](param.path, async (req,res) => {
    param.parseRequiredQueryList.forEach(({key, type}) => {
      try {
        switch (key) {
          case 'string':
            break
          default:
            req.query[key] = JSON.parse(req.query[key] as any)
            break
        }
      }
      catch (e) {
        //Here is no Error Handling.
        //But It is safe because req.query is going to be parsed
        //zodQuerySchema.safeParse Below.
      }
    })
    const body = param.zodBodySchema.safeParse(req.body)
    const query = param.zodQuerySchema.safeParse(req.query)
    if (body.success && query.success) {
      const resData = await param.handleMethod(body.data, query.data)
      switch (resData.responseType) {
        case "application/json":
          res.status(Number(resData.statusCode)).json(resData.data)
          break
        case "text/plain":
          res.status(Number(resData.statusCode)).send(resData.data)
      }

    } else {
      if (param.onValidationFailure === void 0) {
        const error:{[key:string]: ZodError} = {}
        if (!body.success) {
          error.body = body.error
        }
        if (!query.success) {
          error.query = query.error
        }
        res.status(400).send(error)
      } else {
        param.onValidationFailure(res)
      }
    }
  })
}

export const endpoints =  ep.endpoints
