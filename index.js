import sapp, { argv } from "@randajan/simple-lib";


sapp(argv.isBuild, {
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