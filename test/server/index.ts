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

  sushi.endpoints.azumaPost.handle(async (body, query) => {
    return {
      message: `Hello! ${body.name}`
    }
  }, undefined)

  sushi.endpoints.sample.handle(async (body, query) => {
    return {
      message: "this is a sample!"
    }
  },undefined)

  sushi.endpoints.azuma.handle(async (body, query) => {
    return {
      message: `You are Mr./Ms. ${query.name}.`
    }
  },undefined)



  //sushi.endpoints.
  app.use(sushi.init())
}
