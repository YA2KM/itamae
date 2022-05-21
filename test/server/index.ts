import express from 'express'
import * as http from "http";
import * as sushi from 'sushi/server'


export const app = express()
app.use(express.json())
export const readyPromise = new Promise<http.Server>(res => {
  initialize(res)
})


async function initialize(res: (value: (PromiseLike<http.Server> | http.Server)) => void) {
  const listener = app.listen('8080', () => {
    res(listener)
  })

  // sushi.endpoints.azumaGet.handle(async ({body,query}) => {
  //   return {
  //     message: query.name
  //   }
  // },undefined)

  sushi.endpoints.azumaGet.handle({
    async cb ({query}) {
      return {
        message: query.name
      }
    }
  })

  //sushi.endpoints.
  app.use(sushi.init())
}
