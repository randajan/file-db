import sapp from "@randajan/simple-lib";


sapp(process.env.NODE_ENV==="prod", {
    port:4002,
    mode:"node",
    external:["chalk"],
    lib:{
        entries:["index.js"],
        loader:{
            ".jsc":"text"
        }
    }
 
})