import { initServer } from "./app"

async function init() {
    const app = await initServer()
    app.listen(4000, () => console.log("server started at port: " + 4000))
}

init()