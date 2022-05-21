import {assert, expect, test} from 'vitest'
import {readyPromise, app} from "./server";
import axios from "axios";
import * as net from "net";

(async () => {
  const server = await readyPromise
  const address:net.AddressInfo | string | null = server.address()
  if (!(typeof address === 'string' || address === null)) {
    test('azuma test', async () => {
        const {data} = await axios.get(`http://localhost:${address.port}/azuma`,{
          params: {
            name: 'azuma',
            age: 20
          }
        })
        expect(data).toEqual({
          message: 'azuma is 20 years old.'
        })
    })
  }
})();

