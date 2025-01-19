
download "deno"
  download single exe from https://github.com/denoland/deno/releases 
  or follow guide https://docs.deno.com/runtime/manual/getting_started/installation

unzip files provided inside directory 

start server
  "deno run -A --unstable-kv src/serve.ts"
open browser
  http://localhost:8080
browser with pdf viewer required (chrome, firefox)

web app
  1st column
    3 checkbox on top
      filter users by status
      red/yellow/green = reject/deciding/accept
    user list
      color shows status
      click user to open it
  2nd column
    3 radio buttons on top
      set user status
    "User comment" text input
    document list
      checkbox
        mark document as "seen"
      "link"
        open/download document in new tab
      document name
        click to open in 3rd column
      "Document comment" text input
  3rd column
    view pdf/xls document opened from 2nd column
