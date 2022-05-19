import express from "express";
import * as ep from "./endpoints";
import {z, ZodError} from 'zod'

const router = express.Router()

export function init () {
  return router
}
export type method = 'get' | 'post'


export async function __handle<Body,Query,Res>(param:{
  path: string,
  method: method,
  handleMethod: (body: Body,query: Query) => Promise<Res>,
  zodBodySchema: z.ZodSchema,
  zodQuerySchema: z.ZodSchema,
  onValidationFailure: undefined | ((res: Express.Response) => void),
  parseRequiredQueryKeyList: string[]
}) {
  router[param.method](param.path, async (req,res) => {
    param.parseRequiredQueryKeyList.forEach(key => {
      try {
        req.query[key] = JSON.parse(req.query[key] as any)
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
      res.json(await param.handleMethod(body.data, query.data))
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
