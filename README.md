# itamae.js
OpenAPI3 based express Wrap Code Generator With Zod for input validation.


# THIS LIBRALY IS UNDER DEVELOPMENT.
Most of functions are not available.

# How to use

```
cd src/
npm i or yarn
cd ../test/server
npx ts-node ..\..\src\index.ts //Genete typed Wrapcode depends on OpenAPI3 Schema With Zod Schema.
//You can find auto generated code at "./node_modules/sushi/server"
npx ts-node ./index.ts
```

You can import auto generated lib like this.
```
import * as sushi from 'sushi/server'
```
Then, Your Development Experience becomes better ;D
![image](https://user-images.githubusercontent.com/105862245/169307220-d07e3ac3-2df7-40aa-bf05-df7af176a288.png)
![image](https://user-images.githubusercontent.com/105862245/169307384-96a5dc77-fabe-4161-947e-005891283392.png)

And input datas are validated with Zod.
![image](https://user-images.githubusercontent.com/105862245/169307978-9d862466-f13c-408e-9c85-c2813644c264.png)

